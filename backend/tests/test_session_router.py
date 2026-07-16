"""Smoke HTTP de los endpoints de sesión v2 sin cookie (wiring FastAPI/slowapi).

Sin cookie de sesión, `get_current_user_optional` devuelve None (sin tocar Redis),
así que se ejercita el camino real de las dependencias de auth + slowapi + la
inyección de `Response` (Set-Cookie) sin necesidad de un Redis funcional.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """TestClient con `app.state.redis` presente (como asume todo el codebase)."""
    had_redis = hasattr(app.state, "redis")
    prev = getattr(app.state, "redis", None)
    redis = MagicMock()
    redis.get = AsyncMock(return_value=None)
    redis.delete = AsyncMock()
    app.state.redis = redis
    try:
        yield TestClient(app)
    finally:
        if had_redis:
            app.state.redis = prev
        else:
            del app.state.redis


def test_status_without_cookie_is_expired(client):
    resp = client.get("/session/status")
    assert resp.status_code == 200
    assert resp.json()["status"] == "expired"


def test_sessions_panel_requires_auth(client):
    resp = client.get("/session/sessions")
    assert resp.status_code == 401


def test_logout_without_cookie_is_idempotent(client):
    resp = client.post("/session/logout")
    assert resp.status_code == 200
    # Borra la cookie (Set-Cookie con max-age=0 / expires).
    cookie = resp.headers.get("set-cookie", "").lower()
    assert "m4a_sid=" in cookie
