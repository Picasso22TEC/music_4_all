from fastapi import APIRouter, Depends, Query, Request

from app.core.rate_limiter import limiter
from app.core.tidal import TidalDownloader
from app.dependencies import get_authenticated_engine

from .schemas import SearchResponse
from .service import MetadataService

router = APIRouter(prefix="/metadata", tags=["metadata"])
service = MetadataService()


@router.get("/search", response_model=SearchResponse)
@limiter.limit("30/minute")
async def search(
    request: Request,
    q: str = Query(..., min_length=1, max_length=200),
    limit: int = Query(10, ge=1, le=30),
    engine: TidalDownloader = Depends(get_authenticated_engine),
):
    """Busca en Tidal (máx. 30/min por IP)."""
    return await service.search(q, limit, engine)
