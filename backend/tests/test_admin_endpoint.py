"""Tests de los endpoints /admin/* (bans + resumen de usuario).

Mismo patrón que test_quota_endpoints: fakeredis como app.state.redis, auth
sobrescrita, y httpx.AsyncClient sobre la app ASGI. `require_admin` se ejercita de
verdad (no se sobrescribe): se controla quién es admin vía
`settings.admin_tidal_user_ids`.
"""

from __future__ import annotations

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.core import bans
from app.core import user_session as us
from app.dependencies import CurrentUser, get_current_user, get_current_user_optional
from app.main import app

_ADMIN = "admin-1"
_VICTIM = "victim-9"


@pytest.fixture
def _as_admin(monkeypatch):
    monkeypatch.setattr(settings, "admin_tidal_user_ids", [_ADMIN])


@pytest.fixture
async def redis(monkeypatch):
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    had = hasattr(app.state, "redis")
    prev = getattr(app.state, "redis", None)
    app.state.redis = client
    user = CurrentUser(tidal_user_id=_ADMIN, sid="admin-sid")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_user_optional] = lambda: user
    try:
        yield client
    finally:
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


# ── require_admin ─────────────────────────────────────────────────────────────
async def test_non_admin_gets_403(client):
    # Sin configurar admin_tidal_user_ids, nadie es admin.
    resp = await client.get("/admin/bans")
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "FORBIDDEN"


# ── Ban / unban ───────────────────────────────────────────────────────────────
async def test_ban_user_flow(client, redis, _as_admin):
    resp = await client.post("/admin/bans", json={"tidal_user_id": _VICTIM, "reason": "spam"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["tidal_user_id"] == _VICTIM
    assert body["banned_by"] == _ADMIN
    assert await bans.is_banned(redis, _VICTIM) is True


async def test_list_bans_shows_banned(client, redis, _as_admin):
    await bans.ban_user(redis, _VICTIM, reason="abuso")
    resp = await client.get("/admin/bans")
    assert resp.status_code == 200
    ids = [b["tidal_user_id"] for b in resp.json()["bans"]]
    assert _VICTIM in ids


async def test_unban_user(client, redis, _as_admin):
    await bans.ban_user(redis, _VICTIM)
    resp = await client.delete(f"/admin/bans/{_VICTIM}")
    assert resp.status_code == 200
    assert resp.json() == {"tidal_user_id": _VICTIM, "unbanned": True}
    assert await bans.is_banned(redis, _VICTIM) is False


async def test_cannot_ban_admin(client, redis, _as_admin):
    resp = await client.post("/admin/bans", json={"tidal_user_id": _ADMIN, "reason": "x"})
    assert resp.status_code == 403
    assert "administrador" in resp.json()["error"]["message"]
    assert await bans.is_banned(redis, _ADMIN) is False


async def test_temporary_ban_via_ttl(client, redis, _as_admin):
    resp = await client.post(
        "/admin/bans", json={"tidal_user_id": _VICTIM, "reason": "temp", "ttl_seconds": 60}
    )
    assert resp.status_code == 200
    assert resp.json()["expires_at"] is not None
    assert 0 < await redis.ttl(bans._ban_key(_VICTIM)) <= 60


# ── User info ─────────────────────────────────────────────────────────────────
async def test_user_info_summary(client, redis, _as_admin):
    await us.create_app_session(redis, _VICTIM)
    resp = await client.get(f"/admin/users/{_VICTIM}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["tidal_user_id"] == _VICTIM
    assert body["banned"] is False
    assert body["active_sessions"] == 1
    assert body["strikes"] == 0  # se cablea en 6B
