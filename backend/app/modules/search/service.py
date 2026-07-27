import asyncio

from redis.asyncio import Redis

from app.config import settings
from app.core import tidal_cache as tc
from app.core.tidal import TidalDownloader

from .repository import SearchV2Repository
from .schemas import (
    AlbumDetailResponse,
    ArtistDetailResponse,
    ResolveUrlResponse,
    SearchResultsResponse,
)


class SearchV2Service:
    """Búsqueda/detalle del catálogo Tidal con caché global (Fase 4).

    Las lecturas del catálogo son iguales para todos los usuarios, así que se
    cachean SIN scope de usuario vía ``tidal_cache.read_through`` (caché-aside +
    circuit breaker ante 429). Ver ``app/core/tidal_cache.py``.
    """

    def __init__(self) -> None:
        self._repo = SearchV2Repository()

    async def search(
        self, query: str, limit: int, engine: TidalDownloader, redis: Redis
    ) -> SearchResultsResponse:
        return await tc.read_through(
            redis,
            "search",
            (limit, tc.normalize_query(query)),
            settings.tidal_cache_search_ttl,
            loader=lambda: asyncio.to_thread(self._repo.search, query, limit, engine),
            parse=SearchResultsResponse.model_validate,
        )

    async def resolve_url(
        self, url: str, engine: TidalDownloader, redis: Redis
    ) -> ResolveUrlResponse:
        # Sin caché (ttl=None): la respuesta es una union de tipos que no conviene
        # serializar/reparsear; aun así respeta el circuit breaker y cuenta el 429.
        return await tc.read_through(
            redis,
            "resolve",
            (url,),
            None,
            loader=lambda: asyncio.to_thread(self._repo.resolve_url, url, engine),
            parse=ResolveUrlResponse.model_validate,
        )

    async def get_album_detail(
        self, album_id: str, engine: TidalDownloader, redis: Redis
    ) -> AlbumDetailResponse:
        return await tc.read_through(
            redis,
            "album",
            (album_id,),
            settings.tidal_cache_detail_ttl,
            loader=lambda: asyncio.to_thread(self._repo.get_album_detail, album_id, engine),
            parse=AlbumDetailResponse.model_validate,
        )

    async def get_artist_detail(
        self, artist_id: str, engine: TidalDownloader, redis: Redis
    ) -> ArtistDetailResponse:
        return await tc.read_through(
            redis,
            "artist",
            (artist_id,),
            settings.tidal_cache_detail_ttl,
            loader=lambda: asyncio.to_thread(self._repo.get_artist_detail, artist_id, engine),
            parse=ArtistDetailResponse.model_validate,
        )
