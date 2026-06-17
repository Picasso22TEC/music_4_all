"""
Tests for RM-09.1 startup reconciliation.

Covers:
    reconcile_stale_jobs — marks downloading/started/active jobs as failed
    Untouched states      — completed, paused, queued, error left alone
    Idempotency           — second call on already-failed job does nothing
    Mixed sets            — only stale jobs reconciled in a heterogeneous set
    WS events             — publish called for every reconciled job
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

from app.core.reconciliation import reconcile_stale_jobs
from app.modules.download.schemas import DownloadJobStatus


def _make_redis(jobs: list[dict]) -> MagicMock:
    """Build a mock Redis that exposes the given jobs via scan_iter + get."""
    redis = MagicMock()
    keyed: dict[str, dict] = {f"music4all:job:{j['job_id']}": j for j in jobs}

    async def scan_iter(match: str | None = None):
        for key in keyed:
            yield key

    redis.scan_iter = scan_iter

    async def get(key: str) -> str | None:
        job = keyed.get(key)
        return json.dumps(job) if job else None

    redis.get = get
    redis.setex = AsyncMock()
    redis.publish = AsyncMock()
    return redis


def _persisted_state(redis: MagicMock) -> dict:
    """Return the last state written via set_job_state (setex call)."""
    raw: str = redis.setex.call_args.args[2]
    return json.loads(raw)


# ─── Stale status detection ───────────────────────────────────────────────────


class TestStaleDetection:
    async def test_downloading_job_marked_failed(self) -> None:
        redis = _make_redis(
            [
                {"job_id": "j1", "status": "downloading", "spec_status": "active", "title": "X"},
            ]
        )

        count = await reconcile_stale_jobs(redis)

        assert count == 1
        state = _persisted_state(redis)
        assert state["status"] == DownloadJobStatus.FAILED
        assert state["spec_status"] == "error"
        assert "reinicio" in state["error"].lower()

    async def test_started_job_marked_failed(self) -> None:
        redis = _make_redis(
            [
                {"job_id": "j2", "status": "started", "spec_status": "", "title": "Y"},
            ]
        )

        count = await reconcile_stale_jobs(redis)

        assert count == 1
        assert _persisted_state(redis)["status"] == DownloadJobStatus.FAILED

    async def test_active_spec_status_alone_triggers_reconciliation(self) -> None:
        # spec_status=="active" is enough even if status field is unexpected
        redis = _make_redis(
            [
                {"job_id": "j3", "status": "pending", "spec_status": "active", "title": "Z"},
            ]
        )

        count = await reconcile_stale_jobs(redis)

        assert count == 1

    async def test_ws_event_published_for_stale_job(self) -> None:
        redis = _make_redis(
            [
                {"job_id": "j4", "status": "downloading", "spec_status": "active", "title": "A"},
            ]
        )

        await reconcile_stale_jobs(redis)

        # publish_progress calls redis.publish on 2 channels (per-job + global)
        assert redis.publish.await_count == 2


# ─── Untouched states ─────────────────────────────────────────────────────────


class TestUntouchedStates:
    async def test_completed_job_untouched(self) -> None:
        redis = _make_redis(
            [
                {"job_id": "c1", "status": "completed", "spec_status": "completed", "title": "B"},
            ]
        )

        assert await reconcile_stale_jobs(redis) == 0
        redis.setex.assert_not_awaited()

    async def test_paused_job_untouched(self) -> None:
        redis = _make_redis(
            [
                {"job_id": "p1", "status": "paused", "spec_status": "paused", "title": "C"},
            ]
        )

        assert await reconcile_stale_jobs(redis) == 0
        redis.setex.assert_not_awaited()

    async def test_queued_job_untouched(self) -> None:
        redis = _make_redis(
            [
                {"job_id": "q1", "status": "pending", "spec_status": "queued", "title": "D"},
            ]
        )

        assert await reconcile_stale_jobs(redis) == 0
        redis.setex.assert_not_awaited()

    async def test_error_job_untouched(self) -> None:
        redis = _make_redis(
            [
                {
                    "job_id": "e1",
                    "status": "failed",
                    "spec_status": "error",
                    "title": "E",
                    "error": "X",
                },
            ]
        )

        assert await reconcile_stale_jobs(redis) == 0
        redis.setex.assert_not_awaited()

    async def test_empty_redis_returns_zero(self) -> None:
        redis = _make_redis([])

        assert await reconcile_stale_jobs(redis) == 0


# ─── Mixed sets ───────────────────────────────────────────────────────────────


class TestMixedSets:
    async def test_only_stale_jobs_reconciled(self) -> None:
        redis = _make_redis(
            [
                {"job_id": "s1", "status": "downloading", "spec_status": "active", "title": "S1"},
                {"job_id": "s2", "status": "started", "spec_status": "", "title": "S2"},
                {
                    "job_id": "ok1",
                    "status": "completed",
                    "spec_status": "completed",
                    "title": "OK1",
                },
                {"job_id": "ok2", "status": "paused", "spec_status": "paused", "title": "OK2"},
                {"job_id": "ok3", "status": "pending", "spec_status": "queued", "title": "OK3"},
            ]
        )

        count = await reconcile_stale_jobs(redis)

        assert count == 2
        assert redis.setex.await_count == 2

    async def test_original_fields_preserved_in_recovered_state(self) -> None:
        redis = _make_redis(
            [
                {
                    "job_id": "j10",
                    "status": "downloading",
                    "spec_status": "active",
                    "title": "Preservation",
                    "progress": 42.0,
                    "album_id": "999",
                },
            ]
        )

        await reconcile_stale_jobs(redis)

        state = _persisted_state(redis)
        assert state["title"] == "Preservation"
        assert state["progress"] == 42.0
        assert state["album_id"] == "999"


# ─── Idempotency ──────────────────────────────────────────────────────────────


class TestIdempotency:
    async def test_second_call_on_already_failed_job_does_nothing(self) -> None:
        already_failed = {
            "job_id": "j11",
            "status": DownloadJobStatus.FAILED,
            "spec_status": "error",
            "error": "Descarga interrumpida por reinicio del servidor",
            "title": "F",
        }
        redis = _make_redis([already_failed])

        count = await reconcile_stale_jobs(redis)

        assert count == 0
        redis.setex.assert_not_awaited()
