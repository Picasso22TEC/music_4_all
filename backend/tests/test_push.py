"""Tests de Web Push (core/push.py) + endpoint public-key."""

from __future__ import annotations

from types import SimpleNamespace

import fakeredis.aioredis
import pytest
from pywebpush import WebPushException

from app.config import settings
from app.core import push


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


def _sub(endpoint: str = "https://push.example/abc") -> dict:
    return {"endpoint": endpoint, "keys": {"p256dh": "k", "auth": "a"}}


@pytest.fixture
def _push_on(monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "PUB")
    monkeypatch.setattr(settings, "vapid_private_key", "PRIV")


# ── Store ─────────────────────────────────────────────────────────────────────
async def test_save_list_delete_subscription(redis):
    assert await push.save_subscription(redis, "u1", _sub()) is True
    subs = await push.list_subscriptions(redis, "u1")
    assert len(subs) == 1 and subs[0]["endpoint"] == "https://push.example/abc"
    await push.delete_subscription(redis, "u1", "https://push.example/abc")
    assert await push.list_subscriptions(redis, "u1") == []


async def test_save_without_endpoint_is_rejected(redis):
    assert await push.save_subscription(redis, "u1", {"keys": {}}) is False


async def test_subscriptions_are_per_user(redis):
    await push.save_subscription(redis, "u1", _sub("https://a"))
    await push.save_subscription(redis, "u2", _sub("https://b"))
    assert len(await push.list_subscriptions(redis, "u1")) == 1
    assert len(await push.list_subscriptions(redis, "u2")) == 1


# ── notify_user ───────────────────────────────────────────────────────────────
async def test_notify_noop_when_disabled(redis, monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "")
    monkeypatch.setattr(settings, "vapid_private_key", "")
    calls = []
    monkeypatch.setattr(push, "webpush", lambda **kw: calls.append(kw))
    await push.save_subscription(redis, "u1", _sub())
    await push.notify_user(redis, "u1", {"title": "x"})
    assert calls == []  # push desactivado → no se envía nada


async def test_notify_sends_to_each_subscription(redis, _push_on, monkeypatch):
    calls = []
    monkeypatch.setattr(push, "webpush", lambda **kw: calls.append(kw))
    await push.save_subscription(redis, "u1", _sub("https://a"))
    await push.save_subscription(redis, "u1", _sub("https://b"))
    await push.notify_user(redis, "u1", {"title": "Download ready"})
    assert len(calls) == 2


async def test_notify_purges_dead_subscription(redis, _push_on, monkeypatch):
    def _boom(**kw):
        exc = WebPushException("gone")
        exc.response = SimpleNamespace(status_code=410)
        raise exc

    monkeypatch.setattr(push, "webpush", _boom)
    await push.save_subscription(redis, "u1", _sub())
    await push.notify_user(redis, "u1", {"title": "x"})
    # La suscripción caducada (410) se purga.
    assert await push.list_subscriptions(redis, "u1") == []


async def test_notify_keeps_subscription_on_transient_error(redis, _push_on, monkeypatch):
    def _boom(**kw):
        exc = WebPushException("server error")
        exc.response = SimpleNamespace(status_code=500)
        raise exc

    monkeypatch.setattr(push, "webpush", _boom)
    await push.save_subscription(redis, "u1", _sub())
    await push.notify_user(redis, "u1", {"title": "x"})
    # Un 500 no purga (podría ser transitorio).
    assert len(await push.list_subscriptions(redis, "u1")) == 1


# ── Endpoint public-key ───────────────────────────────────────────────────────
def test_public_key_disabled_by_default(api_client_with_state):
    resp = api_client_with_state.get("/push/public-key")
    assert resp.status_code == 200
    assert resp.json() == {"enabled": False, "public_key": None}


def test_public_key_enabled_with_vapid(api_client_with_state, monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "PUBKEY")
    monkeypatch.setattr(settings, "vapid_private_key", "PRIV")
    resp = api_client_with_state.get("/push/public-key")
    assert resp.json() == {"enabled": True, "public_key": "PUBKEY"}
