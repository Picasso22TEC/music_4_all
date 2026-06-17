from __future__ import annotations

import asyncio
import uuid

from app.core import redis_client as rc
from app.core.job_controls import JobControlRegistry
from app.core.tidal import TidalDownloader
from app.modules.download.repository import DownloadRepository
from app.modules.download.schemas import DownloadJobStatus

from .schemas import (
    CancelJobResponse,
    StartDownloadRequest,
    StartDownloadResponse,
    UpdateJobRequest,
    UpdateJobResponse,
)

_repo = DownloadRepository()

# Mapeo legacy status → spec status (para respuestas al frontend)
_TO_SPEC_STATUS: dict[str, str] = {
    DownloadJobStatus.PENDING: "queued",
    DownloadJobStatus.DOWNLOADING: "active",
    DownloadJobStatus.COMPLETED: "completed",
    DownloadJobStatus.FAILED: "error",
    "queued": "queued",
    "active": "active",
    "paused": "paused",
    "completed": "completed",
    "error": "error",
}


def _spec_status(raw: str | None) -> str:
    return _TO_SPEC_STATUS.get(str(raw or ""), "queued")


class JobService:
    async def create_job(
        self,
        req: StartDownloadRequest,
        engine: TidalDownloader,
        app_state: object,
    ) -> StartDownloadResponse:
        if req.album_id:
            url = f"https://tidal.com/browse/album/{req.album_id}"
        else:
            url = f"https://tidal.com/browse/track/{req.track_id}"

        # Obtener título y número de tracks (llamada a Tidal en thread)
        try:
            _, _, tracks, title, _ = await asyncio.to_thread(_repo.prepare, url, engine)
        except ValueError as exc:
            raise exc
        except Exception as exc:
            raise RuntimeError(str(exc)) from exc

        estimated_tracks = len(tracks)
        job_id = str(uuid.uuid4())

        # Estado inicial en Redis — usa "queued" como status del spec
        await rc.set_job_state(
            app_state.redis,
            job_id,
            {  # type: ignore[attr-defined]
                "job_id": job_id,
                "title": title,
                "status": DownloadJobStatus.PENDING,  # para compatibilidad con worker
                "spec_status": "queued",  # status del spec para frontend
                "progress": 0.0,
                "error": None,
                "file_path": None,
                "quality": req.quality,
                "album_id": req.album_id,
                "track_id": req.track_id,
                "estimated_tracks": estimated_tracks,
            },
        )

        # Encolar para el worker (formato compatible con worker actual)
        await rc.enqueue_job(
            app_state.redis,
            {  # type: ignore[attr-defined]
                "job_id": job_id,
                "url": url,
                "title": title,
                "quality": req.quality,
            },
        )

        return StartDownloadResponse(
            job_id=job_id,
            status="queued",
            estimated_tracks=estimated_tracks,
        )

    async def update_job(
        self,
        job_id: str,
        req: UpdateJobRequest,
        app_state: object,
    ) -> UpdateJobResponse:
        redis = app_state.redis  # type: ignore[attr-defined]
        state = await rc.get_job_state(redis, job_id)
        if state is None:
            raise KeyError(f"Job {job_id} no encontrado")

        current = _spec_status(state.get("status"))
        action = req.action

        _reg: JobControlRegistry | None = getattr(app_state, "job_controls", None)

        if action == "pause":
            allowed = {"queued", "active"}
            if current not in allowed:
                raise ValueError(f"No se puede pausar un job en estado '{current}'")
            paused_state = {**state, "spec_status": "paused", "status": "paused"}
            await rc.set_job_state(redis, job_id, paused_state)
            await rc.publish_progress(redis, job_id, paused_state)
            # Signal the running worker so it pauses between tracks.
            ctrl = _reg.get(job_id) if _reg is not None else None
            if ctrl is not None:
                ctrl.pause_event.set()
            return UpdateJobResponse(job_id=job_id, status="paused")

        elif action == "resume":
            if current != "paused":
                raise ValueError(f"No se puede reanudar un job en estado '{current}'")
            ctrl = _reg.get(job_id) if _reg is not None else None

            if ctrl is not None:
                # Worker still alive and blocked on pause_event — just unblock it.
                ctrl.pause_event.clear()
                await rc.set_job_state(
                    redis,
                    job_id,
                    {
                        **state,
                        "status": DownloadJobStatus.DOWNLOADING,
                        "spec_status": "active",
                        "error": None,
                    },
                )
                # Publish job_resumed event: status "pending" → job_resumed in ws_mapper.
                await rc.publish_progress(
                    redis,
                    job_id,
                    {
                        "job_id": job_id,
                        "title": state.get("title", ""),
                        "status": DownloadJobStatus.PENDING,
                    },
                )
            else:
                # Worker gone (app restart / crash) — fall back to re-enqueue.
                url = _url_from_state(state)
                if url is None:
                    raise ValueError(
                        f"No se puede reanudar el job '{job_id}': "
                        "faltan album_id y track_id en el estado almacenado"
                    )
                resumed_state = {
                    **state,
                    "status": DownloadJobStatus.PENDING,
                    "spec_status": "active",
                    "error": None,
                }
                await rc.set_job_state(redis, job_id, resumed_state)
                await rc.enqueue_job(
                    redis,
                    {
                        "job_id": job_id,
                        "url": url,
                        "title": state.get("title", ""),
                        "quality": state.get("quality", "MASTER"),
                    },
                )
                await rc.publish_progress(redis, job_id, resumed_state)
            return UpdateJobResponse(job_id=job_id, status="active")

        elif action == "retry":
            allowed = {"error"}
            if current not in allowed:
                raise ValueError(f"No se puede reintentar un job en estado '{current}'")
            url = _url_from_state(state)
            if url:
                retried_state = {
                    **state,
                    "status": DownloadJobStatus.PENDING,
                    "spec_status": "queued",
                    "error": None,
                    "progress": 0.0,
                }
                await rc.set_job_state(redis, job_id, retried_state)
                await rc.enqueue_job(
                    redis,
                    {
                        "job_id": job_id,
                        "url": url,
                        "title": state.get("title", ""),
                        "quality": state.get("quality", "MASTER"),
                    },
                )
                await rc.publish_progress(redis, job_id, retried_state)
            return UpdateJobResponse(job_id=job_id, status="queued")

        raise ValueError(f"Acción desconocida: {action}")

    async def cancel_job(
        self,
        job_id: str,
        app_state: object,
    ) -> CancelJobResponse:
        redis = app_state.redis  # type: ignore[attr-defined]
        state = await rc.get_job_state(redis, job_id)
        if state is None:
            raise KeyError(f"Job {job_id} no encontrado")

        progress = float(state.get("progress", 0.0))
        estimated = int(state.get("estimated_tracks", 0))
        tracks_saved = int(progress * estimated / 100) if estimated > 0 else 0
        output_path = state.get("file_path")

        cancelled_state = {
            **state,
            "status": DownloadJobStatus.FAILED,
            "spec_status": "error",
            "error": "Cancelado por el usuario",
        }
        await rc.set_job_state(redis, job_id, cancelled_state)
        # Notify WebSocket clients of the cancellation.
        await rc.publish_progress(redis, job_id, cancelled_state)
        # Signal the running worker to abort immediately.
        _reg: JobControlRegistry | None = getattr(app_state, "job_controls", None)
        ctrl = _reg.get(job_id) if _reg is not None else None
        if ctrl is not None:
            ctrl.cancel_event.set()

        return CancelJobResponse(
            job_id=job_id,
            cancelled=True,
            tracks_saved=tracks_saved,
            output_path=output_path,
        )


def _url_from_state(state: dict) -> str | None:
    if state.get("album_id"):
        return f"https://tidal.com/browse/album/{state['album_id']}"
    if state.get("track_id"):
        return f"https://tidal.com/browse/track/{state['track_id']}"
    return None
