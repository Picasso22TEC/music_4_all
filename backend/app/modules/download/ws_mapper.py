"""
Transforms flat Redis Pub/Sub messages (legacy worker format) to the
discriminated-union format expected by the frontend v2 /ws/downloads client.

Legacy flat format published by worker:
    {
        "job_id": "uuid",
        "title": "Album Title",
        "status": "downloading" | "completed" | "failed" | "paused" | "pending",
        "progress": 45.0,
        "error": null,
        "file_path": null
    }

Target spec format (technical-spec.md §5.3):
    {
        "type": "progress" | "job_completed" | "job_error" | "job_paused" | "job_resumed",
        "job_id": "uuid",
        "payload": { ... }
    }

Notes on "pending" status in the channel:
    - Initial job creation does NOT call publish_progress, so "pending" only
      arrives after a PATCH /downloads/{id} { action: "resume" | "retry" }.
    - Both resume and retry re-enqueue the job as "pending", so both are mapped
      to "job_resumed" which signals the frontend that work is restarting.
"""
from __future__ import annotations

from datetime import UTC, datetime


def flat_to_spec_message(data: dict[str, object]) -> dict[str, object] | None:
    """
    Convert a flat Redis progress message to the spec discriminated-union format.

    Args:
        data: Flat dict from the Redis Pub/Sub channel (json.loads output).

    Returns:
        Spec-format dict if the status is actionable, or None to drop the message.
    """
    job_id: str = str(data.get("job_id", ""))
    status: str = str(data.get("status", ""))

    # ── downloading → progress ────────────────────────────────────────────────
    if status == "downloading":
        return {
            "type": "progress",
            "job_id": job_id,
            "payload": {
                # current_track_filename: best available — use title until worker
                # is enriched to publish individual track names (future RM-06).
                "current_track_filename": str(data.get("title", "")),
                # These metrics are not yet available from the current worker.
                # Set to 0 — will be enriched in RM-06 worker enhancement.
                "completed_tracks": 0,
                "total_tracks": 0,
                "progress_percent": _safe_float(data.get("progress", 0.0)),
                "speed_mbps": 0.0,
                "eta_seconds": 0,
            },
        }

    # ── completed → job_completed ─────────────────────────────────────────────
    if status == "completed":
        return {
            "type": "job_completed",
            "job_id": job_id,
            "payload": {
                "output_path": str(data.get("file_path") or ""),
                "completed_at": datetime.now(UTC).isoformat(),
                "total_tracks": 0,
            },
        }

    # ── failed → job_error ────────────────────────────────────────────────────
    if status == "failed":
        return {
            "type": "job_error",
            "job_id": job_id,
            "payload": {
                "code": 500,
                "message": str(data.get("error") or "Download failed"),
                "retriable": False,
                "completed_tracks": 0,
            },
        }

    # ── paused → job_paused (published by jobs/service.py on PATCH pause) ─────
    if status == "paused":
        return {
            "type": "job_paused",
            "job_id": job_id,
            "payload": {},
        }

    # ── pending → job_resumed (published after PATCH resume/retry) ──────────
    # Initial job creation does NOT call publish_progress, so "pending" arriving
    # in the Pub/Sub channel always comes from a resume or retry PATCH operation.
    if status == "pending":
        return {
            "type": "job_resumed",
            "job_id": job_id,
            "payload": {},
        }

    # Unknown / unhandled status — drop silently
    return None


def _safe_float(value: object) -> float:
    """Safely coerce a value to float, defaulting to 0.0."""
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return 0.0
    return 0.0
