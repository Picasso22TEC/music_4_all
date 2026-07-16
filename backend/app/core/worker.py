"""
Worker de descargas — consume la cola Redis y procesa jobs.

Flujo:
  1. BRPOP de music4all:queue:downloads
  2. prepare() → obtiene tracks desde Tidal API
  3. download_single_track() en thread (progress → Pub/Sub via run_coroutine_threadsafe)
  4. Persiste en PostgreSQL
  5. Actualiza job state + publica estado final
  6. Registra métricas Prometheus
"""

import asyncio
import json
import time
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import settings
from app.core import redis_client as rc
from app.core.engine_registry import EngineRegistry
from app.core.job_controls import JobControlRegistry
from app.core.logging_config import get_logger, job_logger
from app.core.metrics import (
    download_duration_seconds,
    downloads_concurrency_limit,
    downloads_in_progress,
    downloads_total,
    tracks_downloaded_total,
)
from app.core.tidal import TidalDownloader
from app.modules.download.repository import DownloadRepository
from app.modules.download.schemas import DownloadJobStatus
from app.modules.history.repository import HistoryRepository

logger = get_logger(__name__)
_download_repo = DownloadRepository()
_history_repo = HistoryRepository()


async def start_worker(
    engine_registry: EngineRegistry,
    redis,
    session_factory: async_sessionmaker[AsyncSession],
    job_controls: JobControlRegistry,
) -> None:
    semaphore = asyncio.Semaphore(settings.max_concurrent_downloads)
    downloads_concurrency_limit.set(settings.max_concurrent_downloads)
    logger.info(
        "Download worker ready — waiting for jobs",
        extra={"max_concurrent": settings.max_concurrent_downloads},
    )
    while True:
        try:
            job = await rc.dequeue_job(redis, timeout=2)
            if job is None:
                continue
            # Block here if the concurrency cap is reached; resumes when a
            # running job finishes and _run_with_semaphore releases the slot.
            await semaphore.acquire()
            asyncio.create_task(
                _run_with_semaphore(
                    _handle_job(job, engine_registry, redis, session_factory, job_controls),
                    semaphore,
                )
            )
        except asyncio.CancelledError:
            logger.info("Download worker shutting down")
            return
        except Exception as exc:
            logger.error("Worker loop error", extra={"error": str(exc)})
            await asyncio.sleep(1)


async def _handle_job(
    job: dict,
    engine_registry: EngineRegistry,
    redis,
    session_factory: async_sessionmaker[AsyncSession],
    job_controls: JobControlRegistry,
) -> None:
    """Resuelve el motor Tidal del **dueño** del job y ejecuta la descarga.

    El motor se toma del ``EngineRegistry`` (fijado con acquire/release para que la
    evicción no lo retire a mitad de descarga). Si el usuario no tiene sesión Tidal
    válida, el job se marca como fallido con un mensaje claro.
    """
    job_id = str(job.get("job_id", ""))
    user_id = job.get("user_id")
    title = job.get("title", "")
    log = job_logger(__name__, job_id)

    engine = await engine_registry.acquire(redis, str(user_id)) if user_id else None
    if engine is None:
        log.warning("No Tidal engine for job — session missing/expired", extra={"user": user_id})
        await _update_state(
            redis,
            job_id,
            title,
            DownloadJobStatus.FAILED,
            0.0,
            error="Sesión de Tidal no disponible. Vuelve a iniciar sesión.",
            user_id=user_id,
        )
        downloads_total.labels(status="failed").inc()
        return

    try:
        await _process_job(job, engine, redis, session_factory, job_controls)
    finally:
        await engine_registry.release(str(user_id))


async def _process_job(
    job: dict,
    engine: TidalDownloader,
    redis,
    session_factory: async_sessionmaker[AsyncSession],
    job_controls: JobControlRegistry,
) -> None:
    job_id = job["job_id"]
    url = job["url"]
    title = job.get("title", "")
    job_quality = job.get("quality", "MASTER")
    user_id = job.get("user_id")  # dueño del job — se propaga a los eventos WS (aislamiento)
    log = job_logger(__name__, job_id)

    # Register control before any download begins so HTTP handlers can signal us.
    ctrl = job_controls.register(job_id)

    # If this job was paused or cancelled before we dequeued it (e.g. the job
    # was in "queued" state and received a PATCH pause before the worker picked
    # it up), honour that state immediately.
    pre_state = await rc.get_job_state(redis, job_id)
    if pre_state is not None:
        pre_status = str(pre_state.get("spec_status") or pre_state.get("status", ""))
        if pre_status in ("failed", "error"):
            log.info("Skipping already-cancelled job", extra={"status": pre_status})
            job_controls.unregister(job_id)
            return
        if pre_status == "paused":
            ctrl.pause_event.set()

    downloads_in_progress.inc()
    start_time = time.monotonic()
    log.info("Job started", extra={"url": url, "title": title})

    # Pub/sub-only event — emitted once before downloading begins.
    # Sets startedAt in the frontend store via ws_mapper → job_started.
    await rc.publish_progress(
        redis,
        job_id,
        {
            "job_id": job_id,
            "title": title,
            "status": DownloadJobStatus.STARTED,
            "started_at": datetime.now(UTC).isoformat(),
            "user_id": user_id,
        },
    )
    await _update_state(redis, job_id, title, DownloadJobStatus.DOWNLOADING, 0.0, user_id=user_id)

    try:
        kind, item_id, tracks, title, folder = await asyncio.to_thread(
            _download_repo.prepare, url, engine
        )
    except Exception as exc:
        log.error("prepare() failed", extra={"error": str(exc)})
        await _update_state(
            redis, job_id, title, DownloadJobStatus.FAILED, 0.0, error=str(exc), user_id=user_id
        )
        downloads_in_progress.dec()
        downloads_total.labels(status="failed").inc()
        job_controls.unregister(job_id)
        return

    total = len(tracks)
    done = 0
    last_file_path = None
    loop = asyncio.get_running_loop()

    # Throttle progress publishing. TidalDownloader's per-chunk callback fires
    # ~150×/s; publishing each one floods Redis (two PUBLISH per event) and
    # balloons the connection pool. One update per whole-percent step (or every
    # 0.5 s while stalled) is smooth in the UI and cheap. Shared across tracks so
    # the cap is per job, not per track. Only the worker's download thread reads
    # and writes it, and tracks download sequentially, so no locking is needed.
    last_pub = {"t": 0.0, "pct": -1}

    for i, track in enumerate(tracks):
        # Pause: block between tracks until resumed or cancelled.
        while ctrl.pause_event.is_set():
            if ctrl.cancel_event.is_set():
                break
            await asyncio.sleep(0.5)

        # Cancel: exit the download loop immediately.
        if ctrl.cancel_event.is_set():
            break

        track_name: str = getattr(track, "name", "") or ""

        def make_cb(idx: int, name: str, n_done: int):
            def cb(p: float) -> None:
                ovr = round((idx + p) / total * 100, 1)
                now = time.monotonic()
                # Throttle: emit only when the whole-percent step advances, or at
                # least every 0.5 s so a slow/stalled track still ticks.
                if int(ovr) == last_pub["pct"] and now - last_pub["t"] < 0.5:
                    return
                last_pub["pct"] = int(ovr)
                last_pub["t"] = now
                elapsed = now - start_time
                # Linear ETA from elapsed time and overall progress.
                # speed_mbps stays 0.0 — no byte-count data available from TidalDownloader.
                eta = round(elapsed * (100.0 - ovr) / ovr) if ovr > 0.0 else 0
                asyncio.run_coroutine_threadsafe(
                    rc.publish_progress(
                        redis,
                        job_id,
                        {
                            "job_id": job_id,
                            "title": title,
                            "status": DownloadJobStatus.DOWNLOADING,
                            "progress": ovr,
                            "completed_tracks": n_done,
                            "total_tracks": total,
                            "current_track_filename": name,
                            "speed_mbps": 0.0,
                            "eta_seconds": eta,
                            "user_id": user_id,
                        },
                    ),
                    loop,
                )

            return cb

        try:
            ok, path_or_err, quality, _, _ = await asyncio.to_thread(
                engine.download_single_track,
                track,
                folder,
                make_cb(i, track_name, done),
                ctrl.cancel_event,
                job_quality,
            )
            # download_single_track returns (False, "Cancelado") when cancel_event fires.
            if ctrl.cancel_event.is_set():
                break
            if ok:
                done += 1
                last_file_path = path_or_err
                tracks_downloaded_total.inc()
                log.info(
                    "Track downloaded",
                    extra={"track": track.name, "quality": quality, "done": done, "total": total},
                )

                artist = getattr(getattr(track, "artist", None), "name", "")
                cover = _cover_url(track)
                album_title = _album_title(track)
                async with session_factory() as session:
                    await _history_repo.save_download(
                        session,
                        title=track.name,
                        artist=artist,
                        album=album_title,
                        quality=quality,
                        cover_url=cover,
                        job_id=job_id,
                    )
                    await _history_repo.save_audit(
                        session,
                        event="download.completed",
                        detail=json.dumps(
                            {"job_id": job_id, "title": track.name, "quality": quality}
                        ),
                    )
            else:
                log.warning(
                    "Track download failed", extra={"track": track.name, "error": path_or_err}
                )
        except Exception as exc:
            log.error("Unexpected error downloading track", extra={"error": str(exc)})
            if ctrl.cancel_event.is_set():
                break

    duration = time.monotonic() - start_time
    download_duration_seconds.observe(duration)
    downloads_in_progress.dec()
    job_controls.unregister(job_id)

    if ctrl.cancel_event.is_set():
        # State and WS event already published by the HTTP cancel handler.
        log.info("Job cancelled by user", extra={"done": done, "total": total})
        downloads_total.labels(status="failed").inc()
        return

    if done == total:
        file_path = last_file_path
        if total > 1:
            folder_path = engine.download_folder / folder
            zip_buf = await asyncio.to_thread(engine.pack_folder_to_zip, folder_path)
            if zip_buf:
                zip_path = engine.download_folder / f"{folder}.zip"
                zip_path.write_bytes(zip_buf.read())
                file_path = str(zip_path)

        downloads_total.labels(status="completed").inc()
        log.info("Job completed", extra={"duration_s": round(duration, 1), "tracks": total})
        await _update_state(
            redis,
            job_id,
            title,
            DownloadJobStatus.COMPLETED,
            100.0,
            file_path=file_path,
            user_id=user_id,
        )
    else:
        downloads_total.labels(status="failed").inc()
        log.warning("Job failed", extra={"done": done, "total": total})
        await _update_state(
            redis,
            job_id,
            title,
            DownloadJobStatus.FAILED,
            round(done / total * 100, 1),
            error=f"{done}/{total} tracks completados",
            user_id=user_id,
        )


async def _run_with_semaphore(coro, semaphore: asyncio.Semaphore) -> None:
    """Awaits coro and releases the semaphore slot when done (even on error)."""
    try:
        await coro
    finally:
        semaphore.release()


async def _update_state(
    redis,
    job_id: str,
    title: str,
    status: DownloadJobStatus,
    progress: float,
    error: str | None = None,
    file_path: str | None = None,
    user_id: str | None = None,
) -> None:
    state = {
        "job_id": job_id,
        "title": title,
        "status": status,
        "progress": progress,
        "error": error,
        "file_path": file_path,
        "user_id": user_id,
    }
    await rc.set_job_state(redis, job_id, state)
    await rc.publish_progress(redis, job_id, state)


def _cover_url(track) -> str | None:
    album = getattr(track, "album", None)
    cover = getattr(album, "cover", None) if album else None
    if not cover:
        return None
    return f"https://resources.tidal.com/images/{cover.replace('-', '/')}/320x320.jpg"


def _album_title(track) -> str | None:
    album = getattr(track, "album", None)
    name = getattr(album, "name", None) if album else None
    return str(name) if name else None
