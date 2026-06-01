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

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core import redis_client as rc
from app.core.logging_config import get_logger, job_logger
from app.core.metrics import (
    download_duration_seconds,
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
    engine: TidalDownloader,
    redis,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    logger.info("Download worker ready — waiting for jobs")
    while True:
        try:
            job = await rc.dequeue_job(redis, timeout=2)
            if job is None:
                continue
            asyncio.create_task(_process_job(job, engine, redis, session_factory))
        except asyncio.CancelledError:
            logger.info("Download worker shutting down")
            return
        except Exception as exc:
            logger.error("Worker loop error", extra={"error": str(exc)})
            await asyncio.sleep(1)


async def _process_job(
    job: dict,
    engine: TidalDownloader,
    redis,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    job_id = job["job_id"]
    url = job["url"]
    title = job.get("title", "")
    log = job_logger(__name__, job_id)

    downloads_in_progress.inc()
    start_time = time.monotonic()
    log.info("Job started", extra={"url": url, "title": title})

    await _update_state(redis, job_id, title, DownloadJobStatus.DOWNLOADING, 0.0)

    try:
        kind, item_id, tracks, title, folder = await asyncio.to_thread(
            _download_repo.prepare, url, engine
        )
    except Exception as exc:
        log.error("prepare() failed", extra={"error": str(exc)})
        await _update_state(redis, job_id, title, DownloadJobStatus.FAILED, 0.0, error=str(exc))
        downloads_in_progress.dec()
        downloads_total.labels(status="failed").inc()
        return

    total = len(tracks)
    done = 0
    last_file_path = None
    loop = asyncio.get_running_loop()

    for i, track in enumerate(tracks):
        def make_cb(idx: int):
            def cb(p: float) -> None:
                progress = round((idx + p) / total * 100, 1)
                asyncio.run_coroutine_threadsafe(
                    rc.publish_progress(redis, job_id, {
                        "job_id": job_id,
                        "title": title,
                        "status": DownloadJobStatus.DOWNLOADING,
                        "progress": progress,
                    }),
                    loop,
                )
            return cb

        try:
            ok, path_or_err, quality, _, _ = await asyncio.to_thread(
                engine.download_single_track,
                track, folder, make_cb(i),
            )
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
                async with session_factory() as session:
                    await _history_repo.save_download(
                        session, title=track.name, artist=artist,
                        quality=quality, cover_url=cover, job_id=job_id,
                    )
                    await _history_repo.save_audit(
                        session, event="download.completed",
                        detail=json.dumps({"job_id": job_id, "title": track.name, "quality": quality}),
                    )
            else:
                log.warning("Track download failed", extra={"track": track.name, "error": path_or_err})
        except Exception as exc:
            log.error("Unexpected error downloading track", extra={"error": str(exc)})

    duration = time.monotonic() - start_time
    download_duration_seconds.observe(duration)
    downloads_in_progress.dec()

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
        await _update_state(redis, job_id, title, DownloadJobStatus.COMPLETED, 100.0,
                            file_path=file_path)
    else:
        downloads_total.labels(status="failed").inc()
        log.warning("Job failed", extra={"done": done, "total": total})
        await _update_state(redis, job_id, title, DownloadJobStatus.FAILED,
                            round(done / total * 100, 1),
                            error=f"{done}/{total} tracks completados")


async def _update_state(
    redis, job_id: str, title: str,
    status: DownloadJobStatus, progress: float,
    error: str | None = None, file_path: str | None = None,
) -> None:
    state = {
        "job_id": job_id, "title": title, "status": status,
        "progress": progress, "error": error, "file_path": file_path,
    }
    await rc.set_job_state(redis, job_id, state)
    await rc.publish_progress(redis, job_id, state)


def _cover_url(track) -> str | None:
    album = getattr(track, "album", None)
    cover = getattr(album, "cover", None) if album else None
    if not cover:
        return None
    return f"https://resources.tidal.com/images/{cover.replace('-', '/')}/320x320.jpg"
