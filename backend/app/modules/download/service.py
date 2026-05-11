"""Servicio del módulo de descargas."""

from .repository import DownloadRepository
from .schemas import DownloadJob


class DownloadService:
    """Lógica de negocio de descargas."""

    def __init__(self, repository: DownloadRepository | None = None):
        self.repository = repository or DownloadRepository()

    async def start_download(self, track_id: str) -> dict:
        return await self.repository.add_to_queue(track_id)

    async def get_status(self, job_id: str) -> DownloadJob:
        return await self.repository.get_progress(job_id)

    async def get_file(self, job_id: str) -> dict:
        return await self.repository.get_file(job_id)
