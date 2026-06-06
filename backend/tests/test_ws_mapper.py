"""
Unit tests for ws_mapper.flat_to_spec_message.

Tests cover all status values that the worker can publish:
    downloading → progress
    completed   → job_completed
    failed      → job_error
    paused      → job_paused      (published via PATCH /downloads/{id})
    pending     → job_resumed     (published via PATCH resume / retry)
    unknown     → None (dropped)
"""
from __future__ import annotations

import pytest

from app.modules.download.ws_mapper import flat_to_spec_message

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _base(status: str, **kwargs: object) -> dict[str, object]:
    return {"job_id": "test-uuid-1234", "title": "OK Computer", "status": status, **kwargs}


# ─── downloading → progress ───────────────────────────────────────────────────

class TestDownloading:
    def test_type_is_progress(self) -> None:
        result = flat_to_spec_message(_base("downloading", progress=45.0))
        assert result is not None
        assert result["type"] == "progress"

    def test_job_id_preserved(self) -> None:
        result = flat_to_spec_message(_base("downloading", progress=10.0))
        assert result is not None
        assert result["job_id"] == "test-uuid-1234"

    def test_progress_percent_mapped(self) -> None:
        result = flat_to_spec_message(_base("downloading", progress=72.5))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["progress_percent"] == 72.5

    def test_zero_progress(self) -> None:
        result = flat_to_spec_message(_base("downloading", progress=0.0))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["progress_percent"] == 0.0

    def test_payload_has_required_keys(self) -> None:
        result = flat_to_spec_message(_base("downloading", progress=50.0))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert "current_track_filename" in payload
        assert "completed_tracks" in payload
        assert "total_tracks" in payload
        assert "progress_percent" in payload
        assert "speed_mbps" in payload
        assert "eta_seconds" in payload

    def test_string_progress_coerced(self) -> None:
        result = flat_to_spec_message(_base("downloading", progress="33.3"))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["progress_percent"] == pytest.approx(33.3)

    def test_missing_progress_defaults_to_zero(self) -> None:
        result = flat_to_spec_message({"job_id": "abc", "status": "downloading"})
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["progress_percent"] == 0.0


# ─── completed → job_completed ────────────────────────────────────────────────

class TestCompleted:
    def test_type_is_job_completed(self) -> None:
        result = flat_to_spec_message(_base("completed", file_path="/tmp/album.zip"))
        assert result is not None
        assert result["type"] == "job_completed"

    def test_output_path_mapped(self) -> None:
        result = flat_to_spec_message(_base("completed", file_path="/downloads/ok.zip"))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["output_path"] == "/downloads/ok.zip"

    def test_null_file_path_becomes_empty_string(self) -> None:
        result = flat_to_spec_message(_base("completed", file_path=None))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["output_path"] == ""

    def test_completed_at_is_iso_string(self) -> None:
        result = flat_to_spec_message(_base("completed", file_path="/f"))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert isinstance(payload["completed_at"], str)
        assert "T" in str(payload["completed_at"])  # ISO 8601 has T separator


# ─── failed → job_error ───────────────────────────────────────────────────────

class TestFailed:
    def test_type_is_job_error(self) -> None:
        result = flat_to_spec_message(_base("failed", error="Session expired"))
        assert result is not None
        assert result["type"] == "job_error"

    def test_error_message_preserved(self) -> None:
        result = flat_to_spec_message(_base("failed", error="Download failed"))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["message"] == "Download failed"

    def test_null_error_uses_fallback(self) -> None:
        result = flat_to_spec_message(_base("failed", error=None))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["message"] == "Download failed"

    def test_code_is_500(self) -> None:
        result = flat_to_spec_message(_base("failed"))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["code"] == 500

    def test_retriable_is_false(self) -> None:
        result = flat_to_spec_message(_base("failed"))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["retriable"] is False


# ─── paused → job_paused ──────────────────────────────────────────────────────

class TestPaused:
    def test_type_is_job_paused(self) -> None:
        result = flat_to_spec_message(_base("paused"))
        assert result is not None
        assert result["type"] == "job_paused"

    def test_payload_is_empty_dict(self) -> None:
        result = flat_to_spec_message(_base("paused"))
        assert result is not None
        assert result["payload"] == {}


# ─── pending → job_resumed ────────────────────────────────────────────────────

class TestPending:
    def test_type_is_job_resumed(self) -> None:
        result = flat_to_spec_message(_base("pending"))
        assert result is not None
        assert result["type"] == "job_resumed"

    def test_payload_is_empty_dict(self) -> None:
        result = flat_to_spec_message(_base("pending"))
        assert result is not None
        assert result["payload"] == {}


# ─── unknown / unhandled status → None ───────────────────────────────────────

class TestUnknownStatus:
    @pytest.mark.parametrize("status", ["", "unknown", "queued", "active", "error"])
    def test_returns_none(self, status: str) -> None:
        result = flat_to_spec_message(_base(status))
        assert result is None

    def test_missing_status_returns_none(self) -> None:
        result = flat_to_spec_message({"job_id": "abc"})
        assert result is None

    def test_empty_dict_returns_none(self) -> None:
        result = flat_to_spec_message({})
        assert result is None


# ─── started → job_started ───────────────────────────────────────────────────

class TestStarted:
    def test_type_is_job_started(self) -> None:
        result = flat_to_spec_message(_base("started", started_at="2024-01-01T00:00:00+00:00"))
        assert result is not None
        assert result["type"] == "job_started"

    def test_job_id_preserved(self) -> None:
        result = flat_to_spec_message(_base("started", started_at="2024-01-01T00:00:00+00:00"))
        assert result is not None
        assert result["job_id"] == "test-uuid-1234"

    def test_started_at_preserved(self) -> None:
        ts = "2024-06-01T12:00:00+00:00"
        result = flat_to_spec_message(_base("started", started_at=ts))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["started_at"] == ts

    def test_missing_started_at_uses_fallback(self) -> None:
        result = flat_to_spec_message(_base("started"))
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert isinstance(payload["started_at"], str)
        assert "T" in str(payload["started_at"])


# ─── Edge cases ───────────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_missing_job_id_becomes_empty_string(self) -> None:
        result = flat_to_spec_message({"status": "downloading", "progress": 10.0})
        assert result is not None
        assert result["job_id"] == ""

    def test_non_string_job_id_coerced(self) -> None:
        result = flat_to_spec_message({"job_id": 42, "status": "completed"})
        assert result is not None
        assert result["job_id"] == "42"

    def test_progress_none_defaults_to_zero(self) -> None:
        result = flat_to_spec_message({"job_id": "x", "status": "downloading", "progress": None})
        assert result is not None
        payload = result["payload"]
        assert isinstance(payload, dict)
        assert payload["progress_percent"] == 0.0
