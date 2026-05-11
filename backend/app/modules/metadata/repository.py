"""Repositorio del módulo de metadatos."""

from .schemas import Album, Track


class MetadataRepository:
    """Acceso a datos de metadatos."""

    async def search(self, query: str) -> dict:
        """Buscar álbumes y canciones."""
        return {"results": []}

    async def get_album(self, album_id: str) -> Album:
        """Obtener detalles de un álbum."""
        return Album(id=album_id, title="Album", artist="Artist", tracks=[])

    async def get_track(self, track_id: str) -> Track:
        """Obtener detalles de una canción."""
        return Track(
            id=track_id,
            title="Track",
            artist="Artist",
            album="Album",
            duration=0,
        )
