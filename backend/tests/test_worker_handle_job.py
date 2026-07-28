"""El worker resuelve el motor del dueño del job vía EngineRegistry (multiusuario)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

import app.core.worker as worker
from app.modules.download.schemas import DownloadJobStatus


@pytest.fixture
def registry():
    reg = MagicMock()
    reg.acquire = AsyncMock()
    reg.release = AsyncMock()
    return reg


@pytest.fixture
def redis():
    """Doble de Redis: `_handle_job` solo lo usa para liberar el cupo de cuota."""
    r = MagicMock()
    r.srem = AsyncMock()
    return r


async def test_handle_job_uses_owner_engine_and_releases(registry, redis, monkeypatch):
    engine = MagicMock()
    registry.acquire.return_value = engine
    process = AsyncMock()
    monkeypatch.setattr(worker, "_process_job", process)

    job = {"job_id": "j1", "url": "u", "title": "T", "user_id": "u1"}
    await worker._handle_job(job, registry, redis, MagicMock(), MagicMock())

    registry.acquire.assert_awaited_once()
    assert registry.acquire.await_args.args[1] == "u1"  # resuelve por user_id
    process.assert_awaited_once()
    assert process.await_args.args[1] is engine  # usa el motor del dueño
    # Sin 'quality' → MASTER → motor device-flow (oauth).
    registry.release.assert_awaited_once_with("u1", "oauth")


async def test_handle_job_releases_quota_slot_when_done(registry, redis, monkeypatch):
    registry.acquire.return_value = MagicMock()
    monkeypatch.setattr(worker, "_process_job", AsyncMock())

    job = {"job_id": "j1", "url": "u", "title": "T", "user_id": "u1"}
    await worker._handle_job(job, registry, redis, MagicMock(), MagicMock())

    # El job terminó: su cupo concurrente queda libre para la siguiente descarga.
    redis.srem.assert_awaited_once_with("music4all:user:u1:jobs:active", "j1")


async def test_handle_job_fails_when_no_engine(registry, redis, monkeypatch):
    registry.acquire.return_value = None  # sesión ausente/expirada del usuario
    process = AsyncMock()
    update = AsyncMock()
    monkeypatch.setattr(worker, "_process_job", process)
    monkeypatch.setattr(worker, "_update_state", update)

    job = {"job_id": "j2", "url": "u", "title": "T", "user_id": "u2"}
    await worker._handle_job(job, registry, redis, MagicMock(), MagicMock())

    process.assert_not_awaited()  # no se descarga sin motor
    update.assert_awaited_once()
    assert update.await_args.args[3] == DownloadJobStatus.FAILED
    # Un job que ni empieza no debe dejar el cupo del usuario ocupado.
    redis.srem.assert_awaited_once_with("music4all:user:u2:jobs:active", "j2")


async def test_handle_job_fails_when_no_user_id(registry, redis, monkeypatch):
    process = AsyncMock()
    update = AsyncMock()
    monkeypatch.setattr(worker, "_process_job", process)
    monkeypatch.setattr(worker, "_update_state", update)

    job = {"job_id": "j3", "url": "u", "title": "T"}  # sin user_id
    await worker._handle_job(job, registry, redis, MagicMock(), MagicMock())

    registry.acquire.assert_not_awaited()
    process.assert_not_awaited()
    update.assert_awaited_once()
