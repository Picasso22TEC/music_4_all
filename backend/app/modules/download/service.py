import asyncio
import uuid

from app.core import redis_client as rc
from app.core.tidal import TidalDownloader
from app.modules.download.schemas import DownloadJobStatus, DownloadStartResponse

from .repository import DownloadRepository

_repo = DownloadRepository()


class DownloadService:
    async def start(
        self, url: str, engine: TidalDownloader, app_state, user_id: str | None = None
    ) -> DownloadStartResponse:
        # Obtener título antes de encolar (llamada rápida a Tidal)
        kind, item_id, tracks, title, folder = await asyncio.to_thread(_repo.prepare, url, engine)

        job_id = str(uuid.uuid4())

        # Estado inicial en Redis
        await rc.set_job_state(
            app_state.redis,
            job_id,
            {
                "job_id": job_id,
                "title": title,
                "status": DownloadJobStatus.PENDING,
                "progress": 0.0,
                "error": None,
                "file_path": None,
                "user_id": user_id,
            },
        )

        # Encolar para el worker
        await rc.enqueue_job(
            app_state.redis,
            {
                "job_id": job_id,
                "url": url,
                "title": title,
                "user_id": user_id,
            },
        )

        return DownloadStartResponse(
            job_id=job_id,
            title=title,
            status=DownloadJobStatus.PENDING,
        )
