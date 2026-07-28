"""El worker elige el motor Tidal según la calidad del job (Fase 5B).

El 16-bit LOSSLESS (``HIGH``) solo lo entrega la segunda sesión PKCE del usuario;
el resto de calidades usan su motor device-flow (``oauth``). Aquí se verifica que
``_handle_job`` toma/suelta el motor del ``kind`` correcto y que, si falta la
sesión Hi-Fi, el job falla con un mensaje que guía al usuario a conectarla.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core import worker


def _job(quality: str) -> dict:
    return {
        "job_id": "j1",
        "user_id": "u1",
        "title": "T",
        "url": "https://tidal.com/browse/track/1",
        "quality": quality,
    }


@pytest.fixture(autouse=True)
def _patch_side_effects(monkeypatch):
    # Aísla el routing: no ejecutar la descarga real ni tocar cuotas.
    monkeypatch.setattr(worker, "_process_job", AsyncMock())
    monkeypatch.setattr(worker.quotas, "release_job", AsyncMock())


def _registry_with_engine(engine):
    reg = MagicMock()
    reg.acquire = AsyncMock(return_value=engine)
    reg.release = AsyncMock()
    return reg


async def test_high_quality_acquires_pkce_engine():
    reg = _registry_with_engine(MagicMock())

    await worker._handle_job(_job("HIGH"), reg, MagicMock(), MagicMock(), MagicMock())

    assert reg.acquire.await_args.args[1:] == ("u1", "pkce")
    reg.release.assert_awaited_once_with("u1", "pkce")


@pytest.mark.parametrize("quality", ["MASTER", "HIRES", "NORMAL"])
async def test_non_16bit_qualities_use_oauth_engine(quality):
    reg = _registry_with_engine(MagicMock())

    await worker._handle_job(_job(quality), reg, MagicMock(), MagicMock(), MagicMock())

    assert reg.acquire.await_args.args[1:] == ("u1", "oauth")
    reg.release.assert_awaited_once_with("u1", "oauth")


async def test_high_without_pkce_session_fails_with_hint(monkeypatch):
    reg = _registry_with_engine(None)  # el usuario no conectó la Hi-Fi
    captured: dict = {}

    async def _fake_update_state(redis, job_id, title, status, progress, **kw):
        captured["status"] = status
        captured["error"] = kw.get("error")

    monkeypatch.setattr(worker, "_update_state", _fake_update_state)

    await worker._handle_job(_job("HIGH"), reg, MagicMock(), MagicMock(), MagicMock())

    assert captured["status"] == worker.DownloadJobStatus.FAILED
    assert "Hi-Fi" in (captured["error"] or "")
    worker._process_job.assert_not_awaited()  # nunca se descargó
    reg.release.assert_not_awaited()  # no se tomó motor → no hay que soltarlo
