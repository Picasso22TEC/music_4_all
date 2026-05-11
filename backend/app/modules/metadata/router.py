"""Router del módulo de metadatos."""

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_engine

from .schemas import Album, Track
from .service import MetadataService

router = APIRouter(prefix="/metadata", tags=["metadata"])
service = MetadataService()


@router.get("/search")
async def search(q: str = Query(..., min_length=1), engine=Depends(get_engine)):
    """Buscar álbumes y canciones."""
    return await service.search(q)


@router.get("/album/{album_id}", response_model=Album)
async def get_album(album_id: str, engine=Depends(get_engine)):
    """Obtener detalles de un álbum."""
    return await service.get_album(album_id)


@router.get("/track/{track_id}", response_model=Track)
async def get_track(track_id: str, engine=Depends(get_engine)):
    """Obtener detalles de una canción."""
    return await service.get_track(track_id)
