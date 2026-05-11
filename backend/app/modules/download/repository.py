"""Repositorio del módulo de descargas."""

from .schemas import DownloadJob, DownloadJobStatus


class DownloadRepository:
    """Acceso a datos de descargas."""

    async def add_to_queue(self, track_id: str) -> dict:
        """Agregar un track a la cola."""
        return {"job_id": "placeholder", "status": "queued", "track_id": track_id}

    async def get_progress(self, job_id: str) -> DownloadJob:
        """Obtener el estado de una descarga."""
        return DownloadJob(
            job_id=job_id,
            track_id="track_123",
            status=DownloadJobStatus.PENDING,
            progress=0.0,
            total_size=0,
            downloaded_size=0,
        )

    async def get_file(self, job_id: str) -> dict:
        """Obtener el archivo asociado a una descarga finalizada."""
        return {"message": "File ready", "job_id": job_id}
