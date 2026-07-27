"""Tests de la caché de catálogo Tidal + circuit breaker (Fase 4).

Cubre: hit/miss, TTL, ttl=None (sin caché), backoff ante 429 (TooManyRequests),
servir caché con el breaker abierto, re-lanzado de 401, y degradación fail-open
cuando Redis falla.
"""

from __future__ import annotations

import fakeredis.aioredis
import pytest
import tidalapi.exceptions as tidal_exc
from pydantic import BaseModel

from app.config import settings
from app.core import tidal_cache as tc
from app.core.exceptions import ApiException


class _Payload(BaseModel):
    value: str
    n: int = 0


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


def _counting_loader(payload: _Payload):
    """Devuelve (loader, calls) donde loader() cuenta cuántas veces se llama."""
    calls = {"n": 0}

    async def loader() -> _Payload:
        calls["n"] += 1
        return payload

    return loader, calls


async def _read(redis, loader, *, kind="search", parts=(50, "radiohead"), ttl=300):
    return await tc.read_through(
        redis, kind, parts, ttl, loader=loader, parse=_Payload.model_validate
    )


# ── Hit / miss ──────────────────────────────────────────────────────────────
async def test_miss_then_hit_does_not_call_tidal_again(redis):
    loader, calls = _counting_loader(_Payload(value="ok", n=1))

    first = await _read(redis, loader)
    second = await _read(redis, loader)

    assert first == second == _Payload(value="ok", n=1)
    assert calls["n"] == 1  # el segundo se sirve de caché — NO golpea a Tidal


async def test_different_keys_are_independent(redis):
    loader_a, calls_a = _counting_loader(_Payload(value="a"))
    loader_b, calls_b = _counting_loader(_Payload(value="b"))

    await _read(redis, loader_a, parts=(50, "a"))
    await _read(redis, loader_b, parts=(50, "b"))
    await _read(redis, loader_a, parts=(50, "a"))  # hit

    assert calls_a["n"] == 1
    assert calls_b["n"] == 1


async def test_cache_respects_ttl(redis):
    loader, _ = _counting_loader(_Payload(value="ok"))
    await _read(redis, loader, parts=(50, "ttltest"), ttl=123)
    assert await redis.ttl(tc._key("search", (50, "ttltest"))) == pytest.approx(123, abs=2)


async def test_ttl_none_never_caches(redis):
    loader, calls = _counting_loader(_Payload(value="ok"))
    await _read(redis, loader, kind="resolve", parts=("url",), ttl=None)
    await _read(redis, loader, kind="resolve", parts=("url",), ttl=None)
    assert calls["n"] == 2  # sin caché → cada lectura llama a Tidal


async def test_disabled_cache_never_caches(redis, monkeypatch):
    monkeypatch.setattr(settings, "tidal_cache_enabled", False)
    loader, calls = _counting_loader(_Payload(value="ok"))
    await _read(redis, loader)
    await _read(redis, loader)
    assert calls["n"] == 2


# ── Circuit breaker (429) ─────────────────────────────────────────────────────
async def test_429_trips_breaker_and_raises_busy(redis):
    async def loader() -> _Payload:
        raise tidal_exc.TooManyRequests("slow down", retry_after=42)

    with pytest.raises(ApiException) as exc:
        await _read(redis, loader)
    assert exc.value.code == "TIDAL_BUSY"
    assert exc.value.http_status == 503
    assert exc.value.retriable is True
    # El breaker quedó abierto con el Retry-After de Tidal (capado por max_ttl).
    assert await redis.get(tc.BREAKER_KEY) == "1"
    assert await redis.ttl(tc.BREAKER_KEY) == pytest.approx(42, abs=2)


async def test_open_breaker_short_circuits_without_calling_tidal(redis):
    await redis.setex(tc.BREAKER_KEY, 30, "1")
    loader, calls = _counting_loader(_Payload(value="ok"))

    with pytest.raises(ApiException) as exc:
        await _read(redis, loader, parts=(50, "nuevo"))
    assert exc.value.code == "TIDAL_BUSY"
    assert calls["n"] == 0  # no se llamó a Tidal durante el backoff


async def test_open_breaker_still_serves_cache(redis):
    # Con entrada cacheada, un breaker abierto NO debe impedir servirla.
    loader, calls = _counting_loader(_Payload(value="cached"))
    await _read(redis, loader, parts=(50, "cacheado"))  # puebla caché
    await redis.setex(tc.BREAKER_KEY, 30, "1")  # abre el breaker

    result = await _read(redis, loader, parts=(50, "cacheado"))
    assert result == _Payload(value="cached")
    assert calls["n"] == 1  # servido de caché, sin nueva llamada


async def test_breaker_ttl_capped_at_max(redis, monkeypatch):
    monkeypatch.setattr(settings, "tidal_breaker_max_ttl", 60)

    async def loader() -> _Payload:
        raise tidal_exc.TooManyRequests("slow down", retry_after=9999)

    with pytest.raises(ApiException):
        await _read(redis, loader)
    assert await redis.ttl(tc.BREAKER_KEY) <= 60


async def test_breaker_default_ttl_when_no_retry_after(redis, monkeypatch):
    monkeypatch.setattr(settings, "tidal_breaker_ttl", 25)

    async def loader() -> _Payload:
        raise tidal_exc.TooManyRequests("slow down")  # retry_after=-1 por defecto

    with pytest.raises(ApiException):
        await _read(redis, loader)
    assert await redis.ttl(tc.BREAKER_KEY) == pytest.approx(25, abs=2)


# ── 401 ────────────────────────────────────────────────────────────────────────
async def test_auth_error_is_reraised_not_wrapped(redis):
    async def loader() -> _Payload:
        raise tidal_exc.AuthenticationError("expired")

    with pytest.raises(tidal_exc.AuthenticationError):
        await _read(redis, loader)
    # 401 NO abre el breaker (puede ser expiración por-usuario, no del client_id)
    assert await redis.get(tc.BREAKER_KEY) is None


# ── Fail-open ────────────────────────────────────────────────────────────────
async def test_fail_open_when_redis_get_raises(redis, monkeypatch):
    async def boom(*_a, **_k):
        raise ConnectionError("redis down")

    monkeypatch.setattr(redis, "get", boom)
    loader, calls = _counting_loader(_Payload(value="ok"))

    result = await _read(redis, loader)  # no debe romper: degrada a llamar a Tidal
    assert result == _Payload(value="ok")
    assert calls["n"] == 1


# ── normalize_query ────────────────────────────────────────────────────────────
def test_normalize_query_collapses_and_lowercases():
    assert tc.normalize_query("  Pink   Floyd  ") == "pink floyd"
    assert tc.normalize_query("RADIOHEAD") == "radiohead"
