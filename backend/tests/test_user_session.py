"""Tests de la capa de sesión de app + tokens Tidal cifrados (app/core/user_session.py)."""

import fakeredis.aioredis
import pytest

from app.core import user_session as us


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


# ── Cifrado ──────────────────────────────────────────────────────────────────
def test_encrypt_decrypt_roundtrip():
    data = {"access_token": "abc", "refresh_token": "def", "n": 1}
    enc = us.encrypt(data)
    assert isinstance(enc, str)
    assert us.decrypt(enc) == data


def test_decrypt_invalid_returns_none():
    assert us.decrypt("not-a-valid-token") is None
    assert us.decrypt("") is None


# ── Sesión de app ────────────────────────────────────────────────────────────
async def test_create_get_delete_session(redis):
    sid = await us.create_app_session(redis, "u1", ip="1.2.3.4", ua="agent")
    assert sid
    data = await us.get_app_session(redis, sid)
    assert data["tidal_user_id"] == "u1"
    assert data["ip"] == "1.2.3.4"
    sessions = await us.list_user_sessions(redis, "u1")
    assert any(s["sid"] == sid for s in sessions)

    await us.delete_app_session(redis, sid)
    assert await us.get_app_session(redis, sid) is None
    assert await us.list_user_sessions(redis, "u1") == []


async def test_get_session_none_for_missing(redis):
    assert await us.get_app_session(redis, None) is None
    assert await us.get_app_session(redis, "nope") is None


async def test_absolute_expiry(redis, monkeypatch):
    # abs TTL negativo → la sesión ya nace expirada (aunque el idle no venza)
    monkeypatch.setattr(us.settings, "session_absolute_ttl", -1)
    sid = await us.create_app_session(redis, "u2")
    monkeypatch.setattr(us.settings, "session_absolute_ttl", 86400)
    assert await us.get_app_session(redis, sid) is None  # expirada y borrada


def test_new_sid_unique_and_long():
    a, b = us.new_sid(), us.new_sid()
    assert a != b
    assert len(a) >= 32


# ── Tokens por usuario (cifrados en reposo) ──────────────────────────────────
async def test_user_tokens_encrypted_at_rest(redis):
    tokens = {"access_token": "secret-xyz", "refresh_token": "r"}
    await us.store_user_tokens(redis, "u3", "oauth", tokens)
    raw = await redis.get("user:u3:tidal:oauth")
    assert "secret-xyz" not in raw  # no está en claro en Redis
    assert await us.get_user_tokens(redis, "u3", "oauth") == tokens
    assert await us.get_user_tokens(redis, "u3", "pkce") is None
    await us.delete_user_tokens(redis, "u3", "oauth")
    assert await us.get_user_tokens(redis, "u3", "oauth") is None


# ── Panel de sesiones / revocación ───────────────────────────────────────────
async def test_list_prunes_stale(redis):
    sid = await us.create_app_session(redis, "u4")
    await redis.delete(us._APP_SESSION.format(sid=sid))  # sesión desaparece, sid queda en el set
    assert await us.list_user_sessions(redis, "u4") == []


async def test_revoke_all_keeps_one(redis):
    keep = await us.create_app_session(redis, "u5")
    other = await us.create_app_session(redis, "u5")
    revoked = await us.revoke_all_sessions(redis, "u5", keep_sid=keep)
    assert revoked == 1
    assert await us.get_app_session(redis, keep) is not None
    assert await us.get_app_session(redis, other) is None
