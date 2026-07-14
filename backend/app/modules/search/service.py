import asyncio

from app.core.tidal import TidalDownloader

from .repository import SearchV2Repository
from .schemas import (
    AlbumDetailResponse,
    ArtistDetailResponse,
    ResolveUrlResponse,
    SearchResultsResponse,
)


class SearchV2Service:
    def __init__(self) -> None:
        self._repo = SearchV2Repository()

    async def search(
        self, query: str, limit: int, engine: TidalDownloader
    ) -> SearchResultsResponse:
        return await asyncio.to_thread(self._repo.search, query, limit, engine)

    async def resolve_url(self, url: str, engine: TidalDownloader) -> ResolveUrlResponse:
        return await asyncio.to_thread(self._repo.resolve_url, url, engine)

    async def get_album_detail(self, album_id: str, engine: TidalDownloader) -> AlbumDetailResponse:
        return await asyncio.to_thread(self._repo.get_album_detail, album_id, engine)

    async def get_artist_detail(
        self, artist_id: str, engine: TidalDownloader
    ) -> ArtistDetailResponse:
        return await asyncio.to_thread(self._repo.get_artist_detail, artist_id, engine)
