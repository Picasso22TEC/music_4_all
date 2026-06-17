import tidalapi.exceptions as tidal_exc
from fastapi import APIRouter, Depends, Query, Request

from app.core.exceptions import ApiException
from app.core.rate_limiter import limiter
from app.core.tidal import TidalDownloader
from app.dependencies import get_authenticated_engine

from .schemas import AlbumDetailResponse, ResolveUrlResponse, SearchResultsResponse
from .service import SearchV2Service

router = APIRouter(tags=["search-v2"])
_service = SearchV2Service()


@router.get("/search", response_model=SearchResultsResponse)
@limiter.limit("30/minute")
async def search(
    request: Request,
    q: str = Query(..., min_length=2, max_length=200, description="Texto de búsqueda"),
    limit: int = Query(50, ge=1, le=50, description="Máximo de resultados por tipo"),
    offset: int = Query(0, ge=0),
    engine: TidalDownloader = Depends(get_authenticated_engine),
):
    """Búsqueda tipada: devuelve álbumes, tracks y playlists en listas separadas."""
    try:
        return await _service.search(q, limit, engine)
    except (tidal_exc.AuthenticationError, AttributeError) as exc:
        raise ApiException(
            "SESSION_EXPIRED", "Sesión de Tidal expirada", 403, retriable=False
        ) from exc
    except Exception as exc:
        raise ApiException("SERVER_ERROR", str(exc), 500, retriable=True) from exc


@router.get("/resolve", response_model=ResolveUrlResponse)
@limiter.limit("30/minute")
async def resolve_url(
    request: Request,
    url: str = Query(..., description="URL completa de Tidal (URL-encoded)"),
    engine: TidalDownloader = Depends(get_authenticated_engine),
):
    """Resuelve una URL de Tidal a su entidad correspondiente (álbum, track o playlist)."""
    try:
        return await _service.resolve_url(url, engine)
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
    except Exception as exc:
        raise ApiException("SERVER_ERROR", str(exc), 500, retriable=True) from exc


@router.get("/albums/{album_id}", response_model=AlbumDetailResponse)
@limiter.limit("30/minute")
async def get_album_detail(
    request: Request,
    album_id: str,
    engine: TidalDownloader = Depends(get_authenticated_engine),
):
    """Detalle completo de un álbum con todos sus tracks."""
    if not album_id.isdigit():
        raise ApiException(
            "INVALID_URL", f"album_id debe ser numérico: {album_id}", 400, retriable=False
        )
    try:
        return await _service.get_album_detail(album_id, engine)
    except tidal_exc.ObjectNotFound as exc:
        raise ApiException(
            "NOT_FOUND", f"Álbum {album_id} no encontrado en Tidal", 404, retriable=False
        ) from exc
    except (tidal_exc.AuthenticationError, AttributeError) as exc:
        raise ApiException(
            "SESSION_EXPIRED", "Sesión de Tidal expirada", 403, retriable=False
        ) from exc
    except Exception as exc:
        raise ApiException("SERVER_ERROR", str(exc), 500, retriable=True) from exc
