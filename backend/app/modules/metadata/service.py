"""Servicio del módulo de metadatos."""

from .repository import MetadataRepository
from .schemas import Album, Track


class MetadataService:
    """Lógica de negocio de metadatos."""

    def __init__(self, repository: MetadataRepository | None = None):
        self.repository = repository or MetadataRepository()

    async def search(self, query: str) -> dict:
        return await self.repository.search(query)

    async def get_album(self, album_id: str) -> Album:
        return await self.repository.get_album(album_id)

    async def get_track(self, track_id: str) -> Track:
        return await self.repository.get_track(track_id)
