import asyncio

from redis.asyncio import Redis

from app.config import settings
from app.core import tidal_cache as tc
from app.core.tidal import TidalDownloader

from .repository import MetadataRepository
from .schemas import SearchResponse


class MetadataService:
    def __init__(self) -> None:
        self.repository = MetadataRepository()

    async def search(
        self, query: str, limit: int, engine: TidalDownloader, redis: Redis
    ) -> SearchResponse:
        # Cacheada globalmente igual que /search (Fase 4): el catálogo es común a
        # todos los usuarios. La caché-aside + circuit breaker vive en tidal_cache.
        def _load() -> SearchResponse:
            results = self.repository.search(query, limit, engine)
            return SearchResponse(results=results, total=len(results))

        return await tc.read_through(
            redis,
            "metadata_search",
            (limit, tc.normalize_query(query)),
            settings.tidal_cache_search_ttl,
            loader=lambda: asyncio.to_thread(_load),
            parse=SearchResponse.model_validate,
        )
