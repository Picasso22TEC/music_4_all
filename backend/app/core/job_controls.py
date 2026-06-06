"""
Per-job pause/cancel controls for the download worker.

Stored on app.state.job_controls (JobControlRegistry).  The worker
registers a JobControl when it picks up a job and unregisters when done.
HTTP handlers (PATCH pause, PATCH resume, DELETE cancel) look up the
registry to signal the running worker.

cancel_event (threading.Event)
    Set by DELETE /downloads/{job_id}.  Checked inside download_single_track
    (thread-pool) — aborts the current track mid-download.  Also checked
    between tracks in the worker loop to exit without starting the next one.

pause_event (threading.Event)
    Set by PATCH { action: "pause" }.  Checked by the worker between tracks.
    When set the worker blocks (asyncio.sleep loop) until the event is cleared
    by PATCH { action: "resume" }.  The current track always completes first.
"""
from __future__ import annotations

import threading


class JobControl:
    __slots__ = ("cancel_event", "pause_event")

    def __init__(self) -> None:
        self.cancel_event = threading.Event()
        self.pause_event = threading.Event()


class JobControlRegistry:
    """
    In-memory registry: job_id → JobControl for every actively-running job.

    Thread-safety model:
      - register / get / unregister are called only from asyncio coroutines
        (single-threaded event loop) → plain dict is safe.
      - threading.Event is internally thread-safe, so setting/clearing from
        an asyncio coroutine is visible to thread-pool workers immediately.
    """

    def __init__(self) -> None:
        self._controls: dict[str, JobControl] = {}

    def register(self, job_id: str) -> JobControl:
        """Create and store a new JobControl for job_id; return it."""
        ctrl = JobControl()
        self._controls[job_id] = ctrl
        return ctrl

    def get(self, job_id: str) -> JobControl | None:
        """Return the control for job_id, or None if the job is not active."""
        return self._controls.get(job_id)

    def unregister(self, job_id: str) -> None:
        """Remove the control for job_id (idempotent)."""
        self._controls.pop(job_id, None)

    def __len__(self) -> int:
        return len(self._controls)
