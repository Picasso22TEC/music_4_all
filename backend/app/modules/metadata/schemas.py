from typing import Literal

from pydantic import BaseModel


class SearchResult(BaseModel):
    id: str
    title: str
    artist: str
    url: str
    cover_url: str | None = None
    type: Literal["album", "track", "playlist"]


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total: int
