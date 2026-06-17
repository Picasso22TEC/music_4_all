from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ArtistOut(BaseModel):
    id: str
    name: str


class LabelOut(BaseModel):
    id: str
    name: str


class AlbumOut(BaseModel):
    id: str
    title: str
    artist: ArtistOut
    cover: str  # UUID formato Tidal
    release_date: str  # "YYYY-MM-DD"
    number_of_tracks: int
    duration: int  # segundos
    audio_quality: str  # "MASTER" | "HIRES" | "HIGH" | "NORMAL"
    audio_modes: list[str]  # ["MQA", "DOLBY_ATMOS", ...]
    upc: str | None = None
    label: LabelOut | None = None
    genre: str | None = None


class TrackOut(BaseModel):
    id: str
    title: str
    track_number: int
    duration: int
    audio_quality: str
    audio_modes: list[str]
    isrc: str | None = None
    artist: ArtistOut
    album: dict[str, Any] | None = None  # {"id": str, "title": str}


class PlaylistOut(BaseModel):
    id: str
    title: str
    number_of_tracks: int
    cover: str | None = None


# ─── Paginación ───────────────────────────────────────────────────────────────


class PaginatedAlbums(BaseModel):
    items: list[AlbumOut]
    total_number_of_items: int
    limit: int
    offset: int


class PaginatedTracks(BaseModel):
    items: list[TrackOut]
    total_number_of_items: int
    limit: int
    offset: int


class PaginatedPlaylists(BaseModel):
    items: list[PlaylistOut]
    total_number_of_items: int
    limit: int
    offset: int


# ─── Responses ────────────────────────────────────────────────────────────────


class SearchResultsResponse(BaseModel):
    albums: PaginatedAlbums
    tracks: PaginatedTracks
    playlists: PaginatedPlaylists


class ResolveUrlResponse(BaseModel):
    type: str  # "album" | "track" | "playlist"
    id: str
    data: AlbumOut | TrackOut | PlaylistOut


class AlbumDetailResponse(BaseModel):
    album: AlbumOut
    tracks: list[TrackOut]
