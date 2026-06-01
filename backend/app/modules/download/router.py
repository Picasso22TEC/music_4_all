from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse

from app.core import redis_client as rc
from app.core.rate_limiter import limiter
from app.core.tidal import TidalDownloader
from app.dependencies import get_authenticated_engine

from .schemas import DownloadRequest, DownloadStartResponse, DownloadStatusResponse
from .service import DownloadService

router = APIRouter(prefix="/download", tags=["download"])
service = DownloadService()


@router.post("/start", response_model=DownloadStartResponse)
@limiter.limit("10/minute")
async def start_download(
    request: Request,
    body: DownloadRequest,
    engine: TidalDownloader = Depends(get_authenticated_engine),
):
    """Encola una descarga de Tidal (máx. 10/min por IP)."""
    return await service.start(body.url, engine, request.app.state)


@router.get("/status/{job_id}", response_model=DownloadStatusResponse)
@limiter.limit("60/minute")
async def get_status(request: Request, job_id: str):
    """Estado actual del job desde Redis."""
    job = await rc.get_job_state(request.app.state.redis, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return DownloadStatusResponse(**job)


@router.get("/file/{job_id}")
@limiter.limit("20/minute")
async def get_file(request: Request, job_id: str):
    """Descarga el archivo cuando el job está completado."""
    job = await rc.get_job_state(request.app.state.redis, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    if job["status"] != "completed":
        raise HTTPException(status_code=409, detail=f"Job no completado: {job['status']}")
    file_path = job.get("file_path")
    if not file_path:
        raise HTTPException(status_code=404, detail="Archivo no disponible")
    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        filename=file_path.split("/")[-1].split("\\")[-1],
    )
