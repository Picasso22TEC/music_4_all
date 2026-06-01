import asyncio
import uuid

from app.core.tidal import TidalDownloader

from .repository import DownloadRepository
from .schemas import DownloadJobStatus, DownloadStartResponse


class DownloadService:
    def __init__(self) -> None:
        self.repository = DownloadRepository()

    async def start(
        self, url: str, engine: TidalDownloader, app_state
    ) -> DownloadStartResponse:
        kind, item_id, tracks, title, folder = await asyncio.to_thread(
            self.repository.prepare, url, engine
        )

        job_id = str(uuid.uuid4())
        app_state.download_jobs[job_id] = {
            "job_id": job_id,
            "title": title,
            "status": DownloadJobStatus.PENDING,
            "progress": 0.0,
            "file_path": None,
            "error": None,
            "total": len(tracks),
            "done": 0,
        }

        asyncio.create_task(
            self.repository.run(
                job_id, tracks, folder, engine,
                app_state.download_jobs, app_state.redis,
            )
        )

        return DownloadStartResponse(
            job_id=job_id,
            title=title,
            status=DownloadJobStatus.PENDING,
        )
