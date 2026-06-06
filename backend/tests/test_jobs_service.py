"""
Tests for JobService pause / resume / cancel with JobControlRegistry.

Focuses on the new RM-07 behaviour:
    pause  — sets pause_event on the running worker
    resume — if worker alive: clears pause_event, no re-enqueue
             if worker gone: falls back to re-enqueue (existing path)
    cancel — sets cancel_event AND publishes WS event (bug fix)
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.job_controls import JobControlRegistry
from app.modules.jobs.schemas import UpdateJobRequest
from app.modules.jobs.service import JobService

# ─── Helpers ──────────────────────────────────────────────────────────────────

_BASE_STATE = {
    "job_id": "job-123",
    "title": "OK Computer",
    "status": "downloading",
    "spec_status": "active",
    "progress": 50.0,
    "error": None,
    "file_path": None,
    "quality": "MASTER",
    "album_id": "777",
    "track_id": None,
    "estimated_tracks": 10,
}

_PAUSED_STATE = {
    **_BASE_STATE,
    "status": "paused",
    "spec_status": "paused",
}


def _make_app_state(registry: JobControlRegistry, state: dict) -> MagicMock:
    app_state = MagicMock()
    app_state.redis = MagicMock()
    app_state.job_controls = registry
    return app_state


# ─── Pause ────────────────────────────────────────────────────────────────────

class TestPause:
    async def test_pause_sets_pause_event_on_active_worker(self) -> None:
        reg = JobControlRegistry()
        ctrl = reg.register("job-123")
        app_state = _make_app_state(reg, _BASE_STATE)

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get, \
             patch("app.modules.jobs.service.rc.set_job_state", new_callable=AsyncMock), \
             patch("app.modules.jobs.service.rc.publish_progress", new_callable=AsyncMock):
            mock_get.return_value = _BASE_STATE
            result = await JobService().update_job("job-123", UpdateJobRequest(action="pause"), app_state)

        assert ctrl.pause_event.is_set()
        assert result.status == "paused"

    async def test_pause_without_active_worker_still_updates_state(self) -> None:
        reg = JobControlRegistry()  # no ctrl registered
        app_state = _make_app_state(reg, _BASE_STATE)

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get, \
             patch("app.modules.jobs.service.rc.set_job_state", new_callable=AsyncMock) as mock_set, \
             patch("app.modules.jobs.service.rc.publish_progress", new_callable=AsyncMock) as mock_pub:
            mock_get.return_value = _BASE_STATE
            result = await JobService().update_job("job-123", UpdateJobRequest(action="pause"), app_state)

        mock_set.assert_awaited_once()
        mock_pub.assert_awaited_once()
        assert result.status == "paused"

    async def test_pause_invalid_state_raises(self) -> None:
        reg = JobControlRegistry()
        app_state = _make_app_state(reg, _PAUSED_STATE)

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = _PAUSED_STATE
            with pytest.raises(ValueError, match="No se puede pausar"):
                await JobService().update_job("job-123", UpdateJobRequest(action="pause"), app_state)


# ─── Resume ───────────────────────────────────────────────────────────────────

class TestResume:
    async def test_resume_clears_pause_event_when_worker_alive(self) -> None:
        reg = JobControlRegistry()
        ctrl = reg.register("job-123")
        ctrl.pause_event.set()  # Simulate currently paused
        app_state = _make_app_state(reg, _PAUSED_STATE)

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get, \
             patch("app.modules.jobs.service.rc.set_job_state", new_callable=AsyncMock), \
             patch("app.modules.jobs.service.rc.publish_progress", new_callable=AsyncMock), \
             patch("app.modules.jobs.service.rc.enqueue_job", new_callable=AsyncMock) as mock_enq:
            mock_get.return_value = _PAUSED_STATE
            result = await JobService().update_job("job-123", UpdateJobRequest(action="resume"), app_state)

        assert not ctrl.pause_event.is_set()
        mock_enq.assert_not_awaited()  # worker alive → no re-enqueue
        assert result.status == "active"

    async def test_resume_publishes_job_resumed_event(self) -> None:
        reg = JobControlRegistry()
        ctrl = reg.register("job-123")
        ctrl.pause_event.set()
        app_state = _make_app_state(reg, _PAUSED_STATE)

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get, \
             patch("app.modules.jobs.service.rc.set_job_state", new_callable=AsyncMock), \
             patch("app.modules.jobs.service.rc.publish_progress", new_callable=AsyncMock) as mock_pub:
            mock_get.return_value = _PAUSED_STATE
            await JobService().update_job("job-123", UpdateJobRequest(action="resume"), app_state)

        # The service publishes {status: PENDING} which ws_mapper maps to job_resumed
        mock_pub.assert_awaited_once()
        _redis, _job_id, published_data = mock_pub.await_args.args
        from app.modules.download.schemas import DownloadJobStatus
        assert published_data.get("status") == DownloadJobStatus.PENDING

    async def test_resume_reenqueues_when_worker_gone(self) -> None:
        reg = JobControlRegistry()  # no ctrl for this job
        app_state = _make_app_state(reg, _PAUSED_STATE)

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get, \
             patch("app.modules.jobs.service.rc.set_job_state", new_callable=AsyncMock), \
             patch("app.modules.jobs.service.rc.publish_progress", new_callable=AsyncMock), \
             patch("app.modules.jobs.service.rc.enqueue_job", new_callable=AsyncMock) as mock_enq:
            mock_get.return_value = _PAUSED_STATE
            result = await JobService().update_job("job-123", UpdateJobRequest(action="resume"), app_state)

        mock_enq.assert_awaited_once()  # fallback: re-enqueue
        assert result.status == "active"

    async def test_resume_invalid_state_raises(self) -> None:
        reg = JobControlRegistry()
        app_state = _make_app_state(reg, _BASE_STATE)

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = _BASE_STATE  # state is "active", not "paused"
            with pytest.raises(ValueError, match="No se puede reanudar"):
                await JobService().update_job("job-123", UpdateJobRequest(action="resume"), app_state)

    async def test_resume_raises_when_url_unavailable(self) -> None:
        """resume with worker gone and missing album_id/track_id raises ValueError (RM-09.2)."""
        reg = JobControlRegistry()  # no ctrl — simulates worker gone after restart
        app_state = _make_app_state(reg, _PAUSED_STATE)

        broken_state = {**_PAUSED_STATE, "album_id": None, "track_id": None}

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = broken_state
            with pytest.raises(ValueError, match="faltan album_id y track_id"):
                await JobService().update_job("job-123", UpdateJobRequest(action="resume"), app_state)


# ─── Cancel ───────────────────────────────────────────────────────────────────

class TestCancel:
    async def test_cancel_sets_cancel_event_on_active_worker(self) -> None:
        reg = JobControlRegistry()
        ctrl = reg.register("job-123")
        app_state = _make_app_state(reg, _BASE_STATE)

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get, \
             patch("app.modules.jobs.service.rc.set_job_state", new_callable=AsyncMock), \
             patch("app.modules.jobs.service.rc.publish_progress", new_callable=AsyncMock):
            mock_get.return_value = _BASE_STATE
            result = await JobService().cancel_job("job-123", app_state)

        assert ctrl.cancel_event.is_set()
        assert result.cancelled is True

    async def test_cancel_publishes_ws_event(self) -> None:
        reg = JobControlRegistry()
        app_state = _make_app_state(reg, _BASE_STATE)

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get, \
             patch("app.modules.jobs.service.rc.set_job_state", new_callable=AsyncMock), \
             patch("app.modules.jobs.service.rc.publish_progress", new_callable=AsyncMock) as mock_pub:
            mock_get.return_value = _BASE_STATE
            await JobService().cancel_job("job-123", app_state)

        mock_pub.assert_awaited_once()
        _, _, published = mock_pub.await_args.args
        assert str(published.get("error")) == "Cancelado por el usuario"

    async def test_cancel_without_active_worker_still_updates_state(self) -> None:
        reg = JobControlRegistry()  # no ctrl
        app_state = _make_app_state(reg, _BASE_STATE)

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get, \
             patch("app.modules.jobs.service.rc.set_job_state", new_callable=AsyncMock) as mock_set, \
             patch("app.modules.jobs.service.rc.publish_progress", new_callable=AsyncMock) as mock_pub:
            mock_get.return_value = _BASE_STATE
            result = await JobService().cancel_job("job-123", app_state)

        mock_set.assert_awaited_once()
        mock_pub.assert_awaited_once()
        assert result.cancelled is True

    async def test_cancel_not_found_raises(self) -> None:
        reg = JobControlRegistry()
        app_state = _make_app_state(reg, _BASE_STATE)

        with patch("app.modules.jobs.service.rc.get_job_state", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            with pytest.raises(KeyError):
                await JobService().cancel_job("job-123", app_state)
