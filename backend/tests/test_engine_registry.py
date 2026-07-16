"""Tests del EngineRegistry (motor Tidal por usuario, caché LRU/TTL + refcount)."""

from __future__ import annotations

import time
from types import SimpleNamespace

import fakeredis.aioredis
import pytest

import app.core.engine_registry as er
from app.core import user_session as us


class FakeEngine:
    """Doble de TidalDownloader: registra construcción, auth y limpieza de temp."""

    instances: list[FakeEngine] = []

    def __init__(self, log_callback=None, session_data=None):
        self.session_data = session_data or {}
        self.session = SimpleNamespace(access_token=self.session_data.get("access_token"))
        self.cleaned = False
        self._auth_ok = True
        self._refresh_to: str | None = None
        FakeEngine.instances.append(self)

    def check_auth(self) -> bool:
        # Simula un refresco in-place del access_token si se configuró.
        if self._refresh_to is not None:
            self.session.access_token = self._refresh_to
        return self._auth_ok

    def _cleanup_temp_dir(self) -> None:
        self.cleaned = True


@pytest.fixture(autouse=True)
def _patch_engine(monkeypatch):
    FakeEngine.instances = []
    monkeypatch.setattr(er, "TidalDownloader", FakeEngine)
    yield


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


async def _store(redis, uid: str, access: str = "tok"):
    await us.store_user_tokens(
        redis, uid, "oauth", {"access_token": access, "refresh_token": "r", "token_type": "Bearer"}
    )


# ── Creación perezosa + caché ─────────────────────────────────────────────────
async def test_get_returns_none_without_tokens(redis):
    reg = er.EngineRegistry()
    assert await reg.get(redis, "nouser") is None


async def test_get_creates_and_caches(redis):
    await _store(redis, "u1")
    reg = er.EngineRegistry()
    e1 = await reg.get(redis, "u1")
    e2 = await reg.get(redis, "u1")
    assert e1 is e2  # misma instancia cacheada
    assert len(FakeEngine.instances) == 1
    assert reg.size() == 1


# ── get_authenticated + refresco ──────────────────────────────────────────────
async def test_get_authenticated_none_when_auth_fails(redis):
    await _store(redis, "u2")
    reg = er.EngineRegistry()
    engine = await reg.get(redis, "u2")
    engine._auth_ok = False
    assert await reg.get_authenticated(redis, "u2") is None


async def test_get_authenticated_repersists_refreshed_token(redis):
    await _store(redis, "u3", access="old")
    reg = er.EngineRegistry()
    engine = await reg.get(redis, "u3")
    engine._refresh_to = "new"  # check_auth cambiará el access_token
    result = await reg.get_authenticated(redis, "u3")
    assert result is engine
    stored = await us.get_user_tokens(redis, "u3", "oauth")
    assert stored["access_token"] == "new"  # re-persistido cifrado


# ── Evicción por TTL ──────────────────────────────────────────────────────────
async def test_idle_engine_evicted_and_cleaned(redis):
    await _store(redis, "old")
    await _store(redis, "fresh")
    reg = er.EngineRegistry(max_engines=50, idle_ttl=1800)
    old_engine = await reg.get(redis, "old")
    # Envejecer artificialmente la entrada "old".
    reg._engines["old"].last_access = time.monotonic() - 10_000
    # Crear otro motor dispara la evicción por TTL.
    await reg.get(redis, "fresh")
    assert "old" not in reg._engines
    assert "fresh" in reg._engines
    assert old_engine.cleaned is True


# ── Tope LRU ──────────────────────────────────────────────────────────────────
async def test_lru_cap_evicts_least_recently_used(redis):
    await _store(redis, "a")
    await _store(redis, "b")
    reg = er.EngineRegistry(max_engines=1, idle_ttl=1800)
    ea = await reg.get(redis, "a")
    await reg.get(redis, "b")
    assert "a" not in reg._engines  # LRU evictado
    assert "b" in reg._engines
    assert ea.cleaned is True


# ── Fijado (refcount) ─────────────────────────────────────────────────────────
async def test_pinned_engine_not_evicted(redis):
    await _store(redis, "pinned")
    await _store(redis, "other")
    reg = er.EngineRegistry(max_engines=1, idle_ttl=1800)
    pinned = await reg.acquire(redis, "pinned")  # refcount = 1
    assert pinned is not None
    await reg.get(redis, "other")  # sobre el tope, pero no puede evictar al fijado
    assert "pinned" in reg._engines
    assert pinned.cleaned is False


async def test_release_unpins(redis):
    await _store(redis, "u")
    reg = er.EngineRegistry()
    await reg.acquire(redis, "u")
    assert reg._engines["u"].refcount == 1
    await reg.release("u")
    assert reg._engines["u"].refcount == 0


async def test_cleanup_all_clears_everything(redis):
    await _store(redis, "x")
    await _store(redis, "y")
    reg = er.EngineRegistry()
    ex = await reg.get(redis, "x")
    ey = await reg.get(redis, "y")
    await reg.cleanup_all()
    assert reg.size() == 0
    assert ex.cleaned and ey.cleaned


async def test_invalidate_removes_single_user(redis):
    await _store(redis, "z")
    reg = er.EngineRegistry()
    ez = await reg.get(redis, "z")
    await reg.invalidate("z")
    assert "z" not in reg._engines
    assert ez.cleaned is True
