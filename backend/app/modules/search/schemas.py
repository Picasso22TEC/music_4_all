from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ArtistOut(BaseModel):
    id: str
    name: str


class ArtistSearchOut(BaseModel):
    """Artista como resultado de búsqueda — incluye foto para pintar la tarjeta."""

    id: str
    name: str
    picture: str | None = None  # URL completa (o None si no tiene imagen)


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
    type: str | None = None  # "ALBUM" | "EP" | "SINGLE" | "COMPILATION"


class TrackOut(BaseModel):
    id: str
    title: str
    track_number: int
    duration: int
    audio_quality: str
    audio_modes: list[str]
    isrc: str | None = None
    artist: ArtistOut
    album: dict[str, Any] | None = None  # {"id": str, "title": str, "cover": str}


class PlaylistOut(BaseModel):
    id: str
    title: str
    number_of_tracks: int
    cover: str | None = None


# ─── Paginación ───────────────────────────────────────────────────────────────


class PaginatedArtists(BaseModel):
    items: list[ArtistSearchOut]
    total_number_of_items: int
    limit: int
    offset: int


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


# ─── Top hit ──────────────────────────────────────────────────────────────────


class TopHitOut(BaseModel):
    """El mejor resultado de la búsqueda (``top_hit`` de tidalapi).

    Un único campo va poblado según ``type``. Se modela con campos concretos (en
    vez de una union) para que el round-trip JSON de la caché (Fase 4) sea
    inequívoco: cada campo tiene un tipo fijo y no hay que discriminar al re-parsear.
    """

    type: str  # "artist" | "album" | "track" | "playlist"
    artist: ArtistSearchOut | None = None
    album: AlbumOut | None = None
    track: TrackOut | None = None
    playlist: PlaylistOut | None = None


# ─── Responses ────────────────────────────────────────────────────────────────


class SearchResultsResponse(BaseModel):
    # Mejor coincidencia primero (como Tidal/Spotify). None si tidalapi no devuelve
    # top_hit o si es un tipo no soportado (p.ej. Video).
    top_hit: TopHitOut | None = None
    artists: PaginatedArtists
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


class ArtistDetailOut(BaseModel):
    id: str
    name: str
    picture: str | None = None  # URL completa (o None si el artista no tiene imagen)


class ArtistDetailResponse(BaseModel):
    artist: ArtistDetailOut
    top_tracks: list[TrackOut]
    albums: list[AlbumOut]
    ep_singles: list[AlbumOut] = []
    other: list[AlbumOut] = []  # compilaciones / apariciones como invitado
    similar: list[ArtistSearchOut] = []
