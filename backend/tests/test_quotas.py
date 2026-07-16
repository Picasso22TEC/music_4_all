"""Tests de cuotas por usuario (concurrentes + diaria) sobre Redis."""

from __future__ import annotations

import fakeredis.aioredis
import pytest

from app.config import settings
from app.core import quotas
from app.core import redis_client as rc
from app.core.exceptions import ApiException


@pytest.fixture
async def redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


@pytest.fixture(autouse=True)
def _limits(monkeypatch):
    """Límites pequeños y deterministas (los settings reales no deben influir)."""
    monkeypatch.setattr(settings, "max_downloads_per_day", 3)
    monkeypatch.setattr(settings, "max_concurrent_jobs_per_user", 2)


async def _queue(redis, job_id: str, uid: str = "u1", status: str = "queued") -> None:
    """Crea un job en curso del usuario, tal como haría el servicio."""
    await rc.set_job_state(redis, job_id, {"job_id": job_id, "user_id": uid, "status": status})
    await quotas.register_job(redis, uid, job_id)


# ── Registro y conteo ─────────────────────────────────────────────────────────
async def test_register_occupies_slot_and_counts_daily(redis):
    await _queue(redis, "j1")
    assert await quotas.active_jobs(redis, "u1") == {"j1"}
    assert await quotas.daily_count(redis, "u1") == 1


async def test_retry_does_not_spend_daily_quota_again(redis):
    await _queue(redis, "j1")
    await quotas.release_job(redis, "u1", "j1")
    # Reencolado (retry/resume): reocupa cupo pero no vuelve a gastar cuota diaria.
    await quotas.register_job(redis, "u1", "j1", count_daily=False)
    assert await quotas.active_jobs(redis, "u1") == {"j1"}
    assert await quotas.daily_count(redis, "u1") == 1


async def test_release_frees_slot(redis):
    await _queue(redis, "j1")
    await quotas.release_job(redis, "u1", "j1")
    assert await quotas.active_jobs(redis, "u1") == set()


async def test_quotas_are_per_user(redis):
    await _queue(redis, "j1", uid="u1")
    await _queue(redis, "j2", uid="u2")
    assert await quotas.active_jobs(redis, "u1") == {"j1"}
    assert await quotas.daily_count(redis, "u2") == 1


# ── Autolimpieza (un worker muerto no debe bloquear cupo) ─────────────────────
@pytest.mark.parametrize("status", ["completed", "failed", "error"])
async def test_terminal_job_stops_occupying_slot(redis, status):
    await _queue(redis, "j1")
    await rc.set_job_state(redis, "j1", {"job_id": "j1", "user_id": "u1", "status": status})
    assert await quotas.active_jobs(redis, "u1") == set()


async def test_paused_job_still_occupies_slot(redis):
    await _queue(redis, "j1", status="paused")
    assert await quotas.active_jobs(redis, "u1") == {"j1"}


async def test_job_whose_state_expired_stops_occupying_slot(redis):
    await _queue(redis, "j1")
    await redis.delete(f"{rc.REDIS_JOB_PREFIX}j1")  # TTL vencido / estado perdido
    assert await quotas.active_jobs(redis, "u1") == set()


async def test_stale_entries_are_pruned_from_the_set(redis):
    await _queue(redis, "j1")
    await redis.delete(f"{rc.REDIS_JOB_PREFIX}j1")
    await quotas.active_jobs(redis, "u1")
    # No solo se ignora al contar: se borra del set para no re-leerlo cada vez.
    assert await redis.smembers("music4all:user:u1:jobs:active") == set()


# ── assert_within_quota ───────────────────────────────────────────────────────
async def test_allows_download_under_both_limits(redis):
    await _queue(redis, "j1")
    await quotas.assert_within_quota(redis, "u1")  # no lanza


async def test_rejects_when_concurrent_limit_reached(redis):
    await _queue(redis, "j1")
    await _queue(redis, "j2")  # 2 = max_concurrent_jobs_per_user
    with pytest.raises(ApiException) as exc:
        await quotas.assert_within_quota(redis, "u1")
    assert exc.value.http_status == 429
    assert exc.value.code == "QUOTA_EXCEEDED"
    assert "en curso" in exc.value.message


async def test_rejects_when_daily_limit_reached(redis):
    for i in range(3):  # 3 = max_downloads_per_day
        await _queue(redis, f"j{i}")
        await rc.set_job_state(redis, f"j{i}", {"user_id": "u1", "status": "completed"})
    # Sin cupo concurrente ocupado (todos terminados), pero la cuota diaria se agotó.
    assert await quotas.active_jobs(redis, "u1") == set()
    with pytest.raises(ApiException) as exc:
        await quotas.assert_within_quota(redis, "u1")
    assert exc.value.http_status == 429
    assert "diario" in exc.value.message


async def test_one_users_quota_does_not_block_another(redis):
    await _queue(redis, "j1", uid="u1")
    await _queue(redis, "j2", uid="u1")  # u1 al límite
    await quotas.assert_within_quota(redis, "u2")  # u2 sigue pudiendo descargar


async def test_zero_means_unlimited(redis, monkeypatch):
    monkeypatch.setattr(settings, "max_downloads_per_day", 0)
    monkeypatch.setattr(settings, "max_concurrent_jobs_per_user", 0)
    for i in range(10):
        await _queue(redis, f"j{i}")
    await quotas.assert_within_quota(redis, "u1")  # no lanza
