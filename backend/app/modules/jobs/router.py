import tidalapi.exceptions as tidal_exc
from fastapi import APIRouter, Depends, Request

from app.core.exceptions import ApiException
from app.core.rate_limiter import limiter
from app.core.tidal import TidalDownloader
from app.dependencies import (
    CurrentUser,
    assert_job_owner,
    get_authenticated_engine,
    get_current_user,
)

from .schemas import (
    CancelJobResponse,
    StartDownloadRequest,
    StartDownloadResponse,
    UpdateJobRequest,
    UpdateJobResponse,
)
from .service import JobService

router = APIRouter(prefix="/downloads", tags=["jobs-v2"])
_service = JobService()


@router.post("", response_model=StartDownloadResponse)
@limiter.limit("10/minute")
async def start_download(
    request: Request,
    body: StartDownloadRequest,
    engine: TidalDownloader = Depends(get_authenticated_engine),
    user: CurrentUser = Depends(get_current_user),
):
    """Encola una descarga de álbum o track individual con calidad específica."""
    try:
        return await _service.create_job(body, engine, request.app.state, user.tidal_user_id)
    except ValueError as exc:
        raise ApiException("INVALID_URL", str(exc), 400, retriable=False) from exc
    except tidal_exc.ObjectNotFound as exc:
        raise ApiException(
            "NOT_FOUND", "Recurso no encontrado en Tidal", 404, retriable=False
        ) from exc
    except (tidal_exc.AuthenticationError, AttributeError) as exc:
        raise ApiException(
            "SESSION_EXPIRED", "Sesión de Tidal expirada", 403, retriable=False
        ) from exc
    except RuntimeError as exc:
        raise ApiException("SERVER_ERROR", str(exc), 500, retriable=True) from exc


@router.patch("/{job_id}", response_model=UpdateJobResponse)
@limiter.limit("60/minute")
async def update_job(
    request: Request,
    job_id: str,
    body: UpdateJobRequest,
    engine: TidalDownloader = Depends(get_authenticated_engine),  # D-05
    user: CurrentUser = Depends(get_current_user),
):
    """Pausa, reanuda o reintenta un job de descarga."""
    # Anti-IDOR: el job debe pertenecer al usuario actual.
    await assert_job_owner(request.app.state.redis, job_id, user)
    try:
        return await _service.update_job(job_id, body, request.app.state)
    except KeyError as exc:
        raise ApiException("NOT_FOUND", str(exc), 404, retriable=False) from exc
    except ValueError as exc:
        raise ApiException("INVALID_TRANSITION", str(exc), 422, retriable=False) from exc


@router.delete("/{job_id}", response_model=CancelJobResponse)
@limiter.limit("20/minute")
async def cancel_job(
    request: Request,
    job_id: str,
    engine: TidalDownloader = Depends(get_authenticated_engine),  # D-06
    user: CurrentUser = Depends(get_current_user),
):
    """Cancela un job. Los archivos descargados hasta el momento se conservan."""
    # Anti-IDOR: el job debe pertenecer al usuario actual.
    await assert_job_owner(request.app.state.redis, job_id, user)
    try:
        return await _service.cancel_job(job_id, request.app.state)
    except KeyError as exc:
        raise ApiException("NOT_FOUND", str(exc), 404, retriable=False) from exc
