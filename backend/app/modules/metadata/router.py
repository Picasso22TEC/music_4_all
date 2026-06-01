from fastapi import APIRouter, Depends, Query

from app.core.tidal import TidalDownloader
from app.dependencies import get_authenticated_engine

from .schemas import SearchResponse
from .service import MetadataService

router = APIRouter(prefix="/metadata", tags=["metadata"])
service = MetadataService()


@router.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Término de búsqueda"),
    limit: int = Query(10, ge=1, le=30),
    engine: TidalDownloader = Depends(get_authenticated_engine),
):
    """Busca álbumes, tracks y playlists en Tidal."""
    return await service.search(q, limit, engine)
