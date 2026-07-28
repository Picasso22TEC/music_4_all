"""TidalDownloader marca la sesión como PKCE al cargar tokens 16-bit (Fase 5B).

Sin ``is_pkce=True``, tidalapi refrescaría el token con el cliente device-flow y
la sesión PKCE (16-bit) se caería al expirar (ver ``Session.token_refresh``).
"""

from __future__ import annotations

import pytest

import app.core.tidal as tidal_mod
from app.core.tidal import TidalDownloader

_TOKENS = {
    "token_type": "Bearer",
    "access_token": "a",
    "refresh_token": "r",
    "expiry_time": "2099-01-01T00:00:00",
}


class _FakeSession:
    def __init__(self) -> None:
        self.captured: dict = {}

    def load_oauth_session(
        self, token_type, access_token, refresh_token, expiry_time, is_pkce=False
    ) -> bool:
        self.captured = {"is_pkce": is_pkce, "access_token": access_token}
        return True


@pytest.fixture
def fake_session(monkeypatch):
    session = _FakeSession()
    monkeypatch.setattr(tidal_mod, "Session", lambda: session)
    return session


def test_engine_loads_session_as_pkce(fake_session):
    engine = TidalDownloader(session_data=_TOKENS, is_pkce=True)
    try:
        assert engine.is_pkce is True
        assert fake_session.captured["is_pkce"] is True
    finally:
        engine._cleanup_temp_dir()


def test_engine_defaults_to_device_flow(fake_session):
    engine = TidalDownloader(session_data=_TOKENS)
    try:
        assert engine.is_pkce is False
        assert fake_session.captured["is_pkce"] is False
    finally:
        engine._cleanup_temp_dir()
