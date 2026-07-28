"""Tests de detección de abuso por strikes (core/abuse.py) + su cableado en cuotas."""

from __future__ import annotations

import time

import fakeredis.aioredis
import pytest

from app.config import settings
from app.core import abuse, quotas
from app.core import redis_client as rc
from app.core.exceptions import ApiException
from app.core.metrics import abuse_alerts_total


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


@pytest.fixture(autouse=True)
def _window(monkeypatch):
    """Ventana amplia y umbral alto por defecto: cada test fija lo que necesita."""
    monkeypatch.setattr(settings, "abuse_strike_window", 3600)
    monkeypatch.setattr(settings, "abuse_strike_alert_threshold", 100)


# ── Conteo y ventana ──────────────────────────────────────────────────────────
async def test_record_strike_increments_count(redis):
    assert await abuse.record_strike(redis, "u1", kind="rate_limit") == 1
    assert await abuse.record_strike(redis, "u1", kind="rate_limit") == 2
    assert await abuse.strike_count(redis, "u1") == 2


async def test_strikes_are_per_user(redis):
    await abuse.record_strike(redis, "u1", kind="quota_daily")
    assert await abuse.strike_count(redis, "u1") == 1
    assert await abuse.strike_count(redis, "u2") == 0


async def test_old_strikes_pruned_from_window(redis, monkeypatch):
    monkeypatch.setattr(settings, "abuse_strike_window", 100)
    # Strike inyectado fuera de la ventana (score viejo) → debe podarse al contar.
    await redis.zadd(abuse._strikes_key("u1"), {"viejo": time.time() - 200})
    await redis.zadd(abuse._strikes_key("u1"), {"nuevo": time.time()})
    assert await abuse.strike_count(redis, "u1") == 1


async def test_clear_strikes(redis):
    await abuse.record_strike(redis, "u1", kind="rate_limit")
    await abuse.clear_strikes(redis, "u1")
    assert await abuse.strike_count(redis, "u1") == 0


# ── Alerta (deduplicada, sin auto-ban) ────────────────────────────────────────
async def test_no_alert_below_threshold(redis, monkeypatch):
    monkeypatch.setattr(settings, "abuse_strike_alert_threshold", 3)
    await abuse.record_strike(redis, "u1", kind="rate_limit")
    await abuse.record_strike(redis, "u1", kind="rate_limit")
    assert await redis.get(abuse._alerted_key("u1")) is None


async def test_alert_fires_once_at_threshold(redis, monkeypatch):
    monkeypatch.setattr(settings, "abuse_strike_alert_threshold", 3)
    before = abuse_alerts_total._value.get()
    for _ in range(6):  # cruza el umbral y sigue golpeando
        await abuse.record_strike(redis, "u1", kind="rate_limit")
    # Cooldown puesto y una única alerta emitida pese a los 6 strikes.
    assert await redis.get(abuse._alerted_key("u1")) == "1"
    assert abuse_alerts_total._value.get() - before == 1


async def test_threshold_zero_disables_alerts(redis, monkeypatch):
    monkeypatch.setattr(settings, "abuse_strike_alert_threshold", 0)
    for _ in range(10):
        await abuse.record_strike(redis, "u1", kind="rate_limit")
    assert await redis.get(abuse._alerted_key("u1")) is None


# ── Cableado en las cuotas ────────────────────────────────────────────────────
async def test_quota_rejection_records_strike(redis, monkeypatch):
    monkeypatch.setattr(settings, "max_downloads_per_day", 0)  # sin límite diario
    monkeypatch.setattr(settings, "max_concurrent_jobs_per_user", 1)
    await rc.set_job_state(redis, "j1", {"job_id": "j1", "user_id": "u1", "status": "queued"})
    await quotas.register_job(redis, "u1", "j1")  # ocupa el único slot

    with pytest.raises(ApiException) as exc:
        await quotas.assert_within_quota(redis, "u1")

    assert exc.value.code == "QUOTA_EXCEEDED"
    assert await abuse.strike_count(redis, "u1") == 1
