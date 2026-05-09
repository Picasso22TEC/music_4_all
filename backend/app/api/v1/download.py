"""Endpoints de descarga"""

from fastapi import APIRouter, HTTPException
from ..schemas.download import DownloadJob, DownloadJobStatus

router = APIRouter(prefix="/download", tags=["download"])

@router.post("/start")
async def start_download(track_id: str):
    """Iniciar descarga de una canción"""
    # TODO: Añadir a cola de descargas
    return {"job_id": "placeholder", "status": "queued"}

@router.get("/status/{job_id}", response_model=DownloadJob)
async def get_download_status(job_id: str):
    """Obtener estado de una descarga"""
    # TODO: Obtener del gestor de descargas
    return {
        "job_id": job_id,
        "track_id": "track_123",
        "status": DownloadJobStatus.PENDING,
        "progress": 0.0,
        "total_size": 0,
        "downloaded_size": 0
    }

@router.get("/file/{job_id}")
async def download_file(job_id: str):
    """Descargar archivo completado"""
    # TODO: Servir el archivo descargado
    return {"message": "File ready"}
