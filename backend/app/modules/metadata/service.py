import asyncio

from app.core.tidal import TidalDownloader

from .repository import MetadataRepository
from .schemas import SearchResponse


class MetadataService:
    def __init__(self) -> None:
        self.repository = MetadataRepository()

    async def search(self, query: str, limit: int, engine: TidalDownloader) -> SearchResponse:
        results = await asyncio.to_thread(self.repository.search, query, limit, engine)
        return SearchResponse(results=results, total=len(results))
