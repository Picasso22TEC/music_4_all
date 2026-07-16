"""La cuota por usuario se aplica de verdad al encolar (HTTP 429) y falla pronto.

Usa fakeredis como `app.state.redis` (las cuotas viven ahí) y sobrescribe las
dependencias de auth para simular la sesión de "test-user", igual que
`api_client_with_state`. Se ejercita con `httpx.AsyncClient` sobre la app ASGI en
el propio event loop del test: `TestClient` levanta un loop por petición y el
cliente de fakeredis no sobrevive a ese cambio.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.core import quotas
from app.core import redis_client as rc
from app.dependencies import (
    CurrentUser,
    get_authenticated_engine,
    get_current_user,
    get_current_user_optional,
)
from app.main import app
from app.modules.jobs import service as jobs_service

_USER = "test-user"


@pytest.fixture(autouse=True)
def _limits(monkeypatch):
    monkeypatch.setattr(settings, "max_downloads_per_day", 5)
    monkeypatch.setattr(settings, "max_concurrent_jobs_per_user", 1)


@pytest.fixture
def prepare(monkeypatch):
    """Sustituye la llamada a Tidal de create_job; registra si llegó a ocurrir."""
    fake = MagicMock(return_value=("album", "1", [MagicMock()], "Album", "folder"))
    monkeypatch.setattr(jobs_service._repo, "prepare", fake)
    return fake


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    had = hasattr(app.state, "redis")
    prev = getattr(app.state, "redis", None)
    app.state.redis = client
    user = CurrentUser(tidal_user_id=_USER, sid="test-sid")
    app.dependency_overrides[get_authenticated_engine] = lambda: MagicMock()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_user_optional] = lambda: user
    try:
        yield client
    finally:
        app.dependency_overrides.pop(get_authenticated_engine, None)
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_current_user_optional, None)
        if had:
            app.state.redis = prev
        else:
            del app.state.redis
        await client.aclose()


@pytest.fixture
async def client(redis):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


async def _occupy_slot(redis, job_id: str, uid: str = _USER) -> None:
    await rc.set_job_state(redis, job_id, {"job_id": job_id, "user_id": uid, "status": "queued"})
    await quotas.register_job(redis, uid, job_id)


async def test_download_within_quota_is_accepted(client, redis, prepare):
    resp = await client.post("/downloads", json={"album_id": "123", "quality": "MASTER"})
    assert resp.status_code == 200
    # El job encolado ocupa cupo del usuario.
    assert len(await quotas.active_jobs(redis, _USER)) == 1
    assert await quotas.daily_count(redis, _USER) == 1


async def test_download_over_concurrent_quota_is_429(client, redis, prepare):
    await _occupy_slot(redis, "busy")  # 1 = max_concurrent_jobs_per_user

    resp = await client.post("/downloads", json={"album_id": "123", "quality": "MASTER"})

    assert resp.status_code == 429
    # Distingue la cuota del rate limit de slowapi, que responde otro cuerpo.
    assert resp.json()["error"]["code"] == "QUOTA_EXCEEDED"
    # Rechazo antes de gastar una llamada al client_id compartido de Tidal.
    prepare.assert_not_called()


async def test_quota_rejection_does_not_enqueue(client, redis, prepare):
    await _occupy_slot(redis, "busy")

    await client.post("/downloads", json={"album_id": "123", "quality": "MASTER"})

    assert await redis.llen(rc.REDIS_QUEUE_KEY) == 0
    assert await quotas.active_jobs(redis, _USER) == {"busy"}


async def test_another_users_jobs_do_not_consume_my_quota(client, redis, prepare):
    await _occupy_slot(redis, "other-busy", uid="someone-else")

    resp = await client.post("/downloads", json={"album_id": "123", "quality": "MASTER"})

    assert resp.status_code == 200
