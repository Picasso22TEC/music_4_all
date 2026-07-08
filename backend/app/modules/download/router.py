from pathlib import PurePath

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

# Media types so the browser <audio> element can decode a streamed track.
# Anything else (e.g. an album .zip) falls back to a plain download.
_AUDIO_MEDIA_TYPES: dict[str, str] = {
    ".flac": "audio/flac",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".opus": "audio/opus",
    ".wav": "audio/wav",
}


def _media_type_for(path: str) -> str:
    return _AUDIO_MEDIA_TYPES.get(PurePath(path).suffix.lower(), "application/octet-stream")


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
    # FileResponse honours the Range header (206 partial content), so the
    # <audio> element can seek. Audio content-type lets the browser decode it;
    # a .zip (full album) stays application/octet-stream and just downloads.
    return FileResponse(
        file_path,
        media_type=_media_type_for(file_path),
        filename=PurePath(file_path).name,
    )
