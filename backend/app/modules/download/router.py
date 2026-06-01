from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse

from app.core.tidal import TidalDownloader
from app.dependencies import get_authenticated_engine

from .schemas import DownloadRequest, DownloadStartResponse, DownloadStatusResponse
from .service import DownloadService

router = APIRouter(prefix="/download", tags=["download"])
service = DownloadService()


@router.post("/start", response_model=DownloadStartResponse)
async def start_download(
    body: DownloadRequest,
    request: Request,
    engine: TidalDownloader = Depends(get_authenticated_engine),
):
    """Inicia la descarga de un track, álbum o playlist de Tidal."""
    return await service.start(body.url, engine, request.app.state)


@router.get("/status/{job_id}", response_model=DownloadStatusResponse)
async def get_status(job_id: str, request: Request):
    """Obtiene el estado actual de un job de descarga."""
    job = request.app.state.download_jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return DownloadStatusResponse(**job)


@router.get("/file/{job_id}")
async def get_file(job_id: str, request: Request):
    """Descarga el archivo cuando el job está completado."""
    job = request.app.state.download_jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    if job["status"] != "completed":
        raise HTTPException(status_code=409, detail=f"Job no completado: {job['status']}")
    if not job.get("file_path"):
        raise HTTPException(status_code=404, detail="Archivo no disponible")
    return FileResponse(
        job["file_path"],
        media_type="application/octet-stream",
        filename=job["file_path"].split("/")[-1],
    )
