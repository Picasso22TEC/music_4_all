"""Router del módulo de descargas."""

from fastapi import APIRouter, Depends

from app.dependencies import get_engine

from .schemas import DownloadJob
from .service import DownloadService

router = APIRouter(prefix="/download", tags=["download"])
service = DownloadService()


@router.post("/start")
async def start_download(track_id: str, engine=Depends(get_engine)):
    """Iniciar descarga de una canción."""
    return await service.start_download(track_id)


@router.get("/status/{job_id}", response_model=DownloadJob)
async def get_download_status(job_id: str, engine=Depends(get_engine)):
    """Obtener estado de una descarga."""
    return await service.get_status(job_id)


@router.get("/file/{job_id}")
async def download_file(job_id: str, engine=Depends(get_engine)):
    """Descargar archivo completado."""
    return await service.get_file(job_id)
