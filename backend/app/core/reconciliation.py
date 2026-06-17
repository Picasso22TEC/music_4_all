"""
Startup reconciliation — marks stale active jobs as failed on server restart.

Called once in lifespan, before start_worker(), so the worker never sees
jobs that were in-flight during a previous process.
"""

from __future__ import annotations

import json

from app.core import redis_client as rc
from app.core.logging_config import get_logger
from app.modules.download.schemas import DownloadJobStatus

logger = get_logger(__name__)

_STALE_STATUSES = frozenset({"downloading", "started"})
_RECONCILE_ERROR = "Descarga interrumpida por reinicio del servidor"


async def reconcile_stale_jobs(redis) -> int:
    """
    Scan all job keys and mark in-progress jobs as failed.

    A job is stale when:
      - status is "downloading" or "started", OR
      - spec_status is "active"

    Completed, paused, queued, and error jobs are left untouched.
    Idempotent: a job already in "error" state is skipped on subsequent calls.

    Returns the number of jobs reconciled.
    """
    reconciled = 0
    pattern = f"{rc.REDIS_JOB_PREFIX}*"

    async for key in redis.scan_iter(match=pattern):
        try:
            raw = await redis.get(key)
            if not raw:
                continue

            state: dict = json.loads(raw)
            job_id: str = state.get("job_id", "")
            status: str = str(state.get("status", ""))
            spec_status: str = str(state.get("spec_status", ""))

            if status not in _STALE_STATUSES and spec_status != "active":
                continue

            recovered_state = {
                **state,
                "status": DownloadJobStatus.FAILED,
                "spec_status": "error",
                "error": _RECONCILE_ERROR,
            }

            await rc.set_job_state(redis, job_id, recovered_state)
            await rc.publish_progress(redis, job_id, recovered_state)

            logger.info(
                "reconciled stale job",
                extra={
                    "job_id": job_id,
                    "previous_status": spec_status or status,
                    "new_status": "error",
                },
            )
            reconciled += 1

        except Exception as exc:
            logger.warning(
                "failed to reconcile job key",
                extra={"key": key, "error": str(exc)},
            )

    if reconciled:
        logger.info(
            "startup reconciliation complete",
            extra={"reconciled": reconciled},
        )

    return reconciled
