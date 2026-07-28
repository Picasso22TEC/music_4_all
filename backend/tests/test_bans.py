"""Tests del store de bans (core/bans.py) y del gate en las dependencias."""

from __future__ import annotations

import json
from types import SimpleNamespace

import fakeredis.aioredis
import pytest

from app.core import bans
from app.core import user_session as us
from app.core.exceptions import ApiException
from app.dependencies import get_current_user, get_current_user_optional


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


def _request(redis, cookies: dict[str, str] | None = None):
    return SimpleNamespace(
        cookies=cookies or {},
        headers={},
        state=SimpleNamespace(),
        app=SimpleNamespace(state=SimpleNamespace(redis=redis)),
    )


# ── Store ─────────────────────────────────────────────────────────────────────
async def test_ban_then_is_banned(redis):
    await bans.ban_user(redis, "u1", reason="spam", banned_by="admin")
    assert await bans.is_banned(redis, "u1") is True
    record = await bans.get_ban(redis, "u1")
    assert record["tidal_user_id"] == "u1"
    assert record["reason"] == "spam"
    assert record["banned_by"] == "admin"
    assert record["expires_at"] is None  # permanente


async def test_not_banned_by_default(redis):
    assert await bans.is_banned(redis, "nobody") is False
    assert await bans.get_ban(redis, "nobody") is None


async def test_ban_revokes_all_sessions(redis):
    # Un usuario con dos sesiones abiertas queda fuera al instante al banear.
    await us.create_app_session(redis, "u1")
    await us.create_app_session(redis, "u1")
    assert len(await us.list_user_sessions(redis, "u1")) == 2

    await bans.ban_user(redis, "u1", reason="abuso")

    assert await us.list_user_sessions(redis, "u1") == []


async def test_temporary_ban_sets_ttl(redis):
    await bans.ban_user(redis, "u1", ttl_seconds=120)
    ttl = await redis.ttl(bans._ban_key("u1"))
    assert 0 < ttl <= 120
    record = await bans.get_ban(redis, "u1")
    assert record["expires_at"] is not None


async def test_permanent_ban_has_no_ttl(redis):
    await bans.ban_user(redis, "u1")
    assert await redis.ttl(bans._ban_key("u1")) == -1  # sin expiración


async def test_unban_removes_ban(redis):
    await bans.ban_user(redis, "u1")
    assert await bans.unban_user(redis, "u1") is True
    assert await bans.is_banned(redis, "u1") is False


async def test_unban_nonexistent_returns_false(redis):
    assert await bans.unban_user(redis, "u1") is False


async def test_list_bans_sorted_newest_first(redis):
    await bans.ban_user(redis, "old")
    # Fuerza un banned_at posterior escribiendo el registro a mano.
    await redis.set(
        bans._ban_key("new"),
        json.dumps({"tidal_user_id": "new", "reason": "", "banned_by": "", "banned_at": 9e9}),
    )
    listed = await bans.list_bans(redis)
    assert [b["tidal_user_id"] for b in listed] == ["new", "old"]


async def test_corrupt_record_treated_as_not_banned(redis):
    await redis.set(bans._ban_key("u1"), "no-es-json")
    assert await bans.is_banned(redis, "u1") is False


# ── Gate en las dependencias ──────────────────────────────────────────────────
async def test_current_user_optional_raises_when_banned(redis):
    # Sesión válida + ban escrito a mano (sin revocar sesiones) → 403 ACCOUNT_BANNED.
    sid = await us.create_app_session(redis, "u1")
    await redis.set(
        bans._ban_key("u1"),
        json.dumps({"tidal_user_id": "u1", "reason": "spam", "banned_by": "admin"}),
    )
    with pytest.raises(ApiException) as exc:
        await get_current_user_optional(_request(redis, {"m4a_sid": sid}))
    assert exc.value.http_status == 403
    assert exc.value.code == "ACCOUNT_BANNED"
    assert "spam" in exc.value.message


async def test_current_user_required_raises_when_banned(redis):
    sid = await us.create_app_session(redis, "u1")
    await redis.set(bans._ban_key("u1"), json.dumps({"tidal_user_id": "u1"}))
    with pytest.raises(ApiException) as exc:
        await get_current_user(_request(redis, {"m4a_sid": sid}))
    assert exc.value.code == "ACCOUNT_BANNED"


async def test_unbanned_user_passes_gate(redis):
    sid = await us.create_app_session(redis, "u1")
    user = await get_current_user_optional(_request(redis, {"m4a_sid": sid}))
    assert user is not None
    assert user.tidal_user_id == "u1"
