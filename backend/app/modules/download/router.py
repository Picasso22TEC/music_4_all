import asyncio
from pathlib import PurePath

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse

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


# Headers de la respuesta upstream de Tidal que reenviamos tal cual (habilitan
# el seek del <audio>: rango parcial 206).
_PROXY_PASSTHROUGH_HEADERS = ("Content-Length", "Content-Range", "Accept-Ranges")


@router.get("/stream/{track_id}")
@limiter.limit("240/minute")
async def stream_track(
    request: Request,
    track_id: str,
    engine: TidalDownloader = Depends(get_authenticated_engine),
):
    """Reproduce (streaming) un track de Tidal por su id, sin descargarlo.

    Resuelve la URL AAC/MP4 directa (calidad NORMAL) y la **proxea** al cliente
    con soporte de Range, para que el `<audio>` pueda hacer seek. No se redirige
    porque las URLs de Tidal son firmadas, efímeras y sin CORS. El lossless
    (DASH segmentado) queda fuera de este endpoint.
    """
    try:
        tid = int(track_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Track no encontrado") from None

    try:
        track_obj = await asyncio.to_thread(engine.session.track, tid)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Track no encontrado") from exc

    # Llamada de red a Tidal → hilo (no bloquear el event loop).
    url, method = await asyncio.to_thread(engine.get_stream_source, track_obj, "NORMAL")
    if not url or method != "DIRECT":
        raise HTTPException(status_code=502, detail="No se pudo resolver el stream del track")

    # Reenviar el Range entrante a la CDN de Tidal para habilitar el seek.
    range_header = request.headers.get("range")
    fwd_headers = {"Range": range_header} if range_header else {}

    def _open_upstream() -> requests.Response:
        r = requests.get(url, stream=True, headers=fwd_headers, timeout=15)
        r.raise_for_status()
        return r

    try:
        upstream = await asyncio.to_thread(_open_upstream)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Error abriendo el stream") from exc

    passthrough = {
        h: upstream.headers[h] for h in _PROXY_PASSTHROUGH_HEADERS if h in upstream.headers
    }
    passthrough.setdefault("Accept-Ranges", "bytes")

    def _body():
        try:
            for chunk in upstream.iter_content(chunk_size=64 * 1024):
                if chunk:
                    yield chunk
        finally:
            upstream.close()

    return StreamingResponse(
        _body(),
        status_code=upstream.status_code,  # 206 si respetó el Range, si no 200
        media_type="audio/mp4",
        headers=passthrough,
    )
