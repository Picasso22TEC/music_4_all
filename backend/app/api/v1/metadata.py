"""Endpoints de búsqueda y metadatos"""

from fastapi import APIRouter, Query
from ..schemas.metadata import Album, Track

router = APIRouter(prefix="/metadata", tags=["metadata"])

@router.get("/search")
async def search(q: str = Query(..., min_length=1)):
    """Buscar álbumes y canciones"""
    # TODO: Implementar búsqueda en Tidal
    return {"results": []}

@router.get("/album/{album_id}", response_model=Album)
async def get_album(album_id: str):
    """Obtener detalles de un álbum"""
    # TODO: Implementar obtención de metadatos de Tidal
    return {"id": album_id, "title": "Album", "artist": "Artist", "tracks": []}

@router.get("/track/{track_id}", response_model=Track)
async def get_track(track_id: str):
    """Obtener detalles de una canción"""
    # TODO: Implementar obtención de metadatos de Tidal
    return {"id": track_id, "title": "Track", "artist": "Artist", "album": "Album", "duration": 0}
