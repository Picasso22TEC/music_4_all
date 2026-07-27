"""Tests de la auth PKCE por usuario (segunda sesión Tidal para 16-bit, Fase 5).

Cubre: status/disconnect, start (guarda la sesión pendiente + URL), complete
(canje OK → guarda tokens 'pkce'), y los rechazos: sin iniciar, y cuenta distinta.
"""

from __future__ import annotations

from types import SimpleNamespace

import fakeredis.aioredis
import pytest

from app.core import user_session as us
from app.core.exceptions import ApiException
from app.modules.session import service as service_module
from app.modules.session.service import SessionService


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


class FakeTidalSession:
    """tidalapi.Session simulada para el flujo PKCE."""

    def __init__(self, uid: str = "u1", logged_in: bool = True) -> None:
        self._logged_in = logged_in
        self.token_type = "Bearer"
        self.access_token = "pkce-access"
        self.refresh_token = "pkce-refresh"
        self.expiry_time = None
        self.user = SimpleNamespace(id=uid)

    def pkce_login_url(self) -> str:
        return "https://login.tidal.com/authorize?response_type=code&client_id=6BDSRdpK9hqEBTgU"

    def pkce_get_auth_token(self, redirect_url: str) -> dict:
        return {"access_token": "pkce-access"}

    def process_auth_token(self, token: dict, is_pkce_token: bool = False) -> None:
        pass

    def check_login(self) -> bool:
        return self._logged_in


def _app_state(redis) -> SimpleNamespace:
    return SimpleNamespace(redis=redis)


# ── status / disconnect ───────────────────────────────────────────────────────
async def test_status_false_then_true_after_store(redis):
    svc = SessionService()
    assert (await svc.pkce_status(redis, "u1")).connected is False
    await us.store_user_tokens(redis, "u1", "pkce", {"access_token": "x"})
    assert (await svc.pkce_status(redis, "u1")).connected is True


async def test_disconnect_removes_tokens(redis):
    svc = SessionService()
    await us.store_user_tokens(redis, "u1", "pkce", {"access_token": "x"})
    res = await svc.disconnect_pkce(redis, "u1")
    assert res.connected is False
    assert (await svc.pkce_status(redis, "u1")).connected is False


# ── start ─────────────────────────────────────────────────────────────────────
async def test_start_returns_url_and_stores_pending(redis, monkeypatch):
    monkeypatch.setattr(service_module.tidalapi, "Session", lambda: FakeTidalSession())
    svc = SessionService()
    app_state = _app_state(redis)

    res = await svc.start_pkce(app_state, "u1")

    assert res.login_url.startswith("https://login.tidal.com/authorize")
    assert "u1" in app_state.pending_pkce  # sesión pendiente guardada en memoria


# ── complete ──────────────────────────────────────────────────────────────────
async def test_complete_stores_pkce_tokens(redis, monkeypatch):
    monkeypatch.setattr(service_module.tidalapi, "Session", lambda: FakeTidalSession(uid="u1"))
    svc = SessionService()
    app_state = _app_state(redis)
    await svc.start_pkce(app_state, "u1")

    res = await svc.complete_pkce(app_state, "u1", "https://tidal.com/android/login/auth?code=abc")

    assert res.connected is True
    assert (await us.get_user_tokens(redis, "u1", "pkce")) is not None
    assert "u1" not in app_state.pending_pkce  # se limpió la entrada pendiente


async def test_complete_without_start_is_400(redis):
    svc = SessionService()
    app_state = _app_state(redis)
    with pytest.raises(ApiException) as exc:
        await svc.complete_pkce(app_state, "u1", "https://tidal.com/x?code=abc")
    assert exc.value.code == "PKCE_NOT_STARTED"
    assert exc.value.http_status == 400


async def test_complete_wrong_account_is_403(redis, monkeypatch):
    # El login PKCE resuelve a OTRA cuenta (u2) distinta de la sesión (u1).
    monkeypatch.setattr(service_module.tidalapi, "Session", lambda: FakeTidalSession(uid="u2"))
    svc = SessionService()
    app_state = _app_state(redis)
    await svc.start_pkce(app_state, "u1")

    with pytest.raises(ApiException) as exc:
        await svc.complete_pkce(app_state, "u1", "https://tidal.com/x?code=abc")
    assert exc.value.code == "PKCE_WRONG_ACCOUNT"
    assert exc.value.http_status == 403
    # No debe haber guardado tokens de la cuenta ajena.
    assert (await us.get_user_tokens(redis, "u1", "pkce")) is None
