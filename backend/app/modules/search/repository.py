from __future__ import annotations

from datetime import date

import tidalapi

from app.core.tidal import TidalDownloader

from .schemas import (
    AlbumDetailResponse,
    AlbumOut,
    ArtistOut,
    LabelOut,
    PaginatedAlbums,
    PaginatedPlaylists,
    PaginatedTracks,
    PlaylistOut,
    ResolveUrlResponse,
    SearchResultsResponse,
    TrackOut,
)

# ─── Helpers de mapeo ─────────────────────────────────────────────────────────


def _map_audio_quality(q: object) -> str:
    """Convierte quality de tidalapi al string del spec."""
    if q is None:
        return "HIGH"
    s = str(q).upper().replace("QUALITY.", "")
    if "HI_RES_LOSSLESS" in s or "HIRES_LOSSLESS" in s:
        return "MASTER"
    if "HI_RES" in s or "MASTER" in s:
        return "HIRES"
    if "LOSSLESS" in s or "HIGH_LOSSLESS" in s:
        return "HIGH"
    return "NORMAL"


def _map_audio_modes(modes: object) -> list[str]:
    """Convierte audio modes de tidalapi al formato del spec."""
    if not modes:
        return []
    result: list[str] = []
    for m in modes:
        s = str(m).upper()
        if "MQA" in s:
            result.append("MQA")
        elif "360" in s or "SONY" in s:
            result.append("SONY_360RA")
        elif "DOLBY" in s or "ATMOS" in s:
            result.append("DOLBY_ATMOS")
        elif "STEREO" in s:
            result.append("STEREO")
    return result


def _artist_out(artist: object) -> ArtistOut:
    return ArtistOut(
        id=str(getattr(artist, "id", "") or ""),
        name=str(getattr(artist, "name", "") or ""),
    )


def _release_date_str(d: object) -> str:
    if d is None:
        return ""
    if isinstance(d, date):
        return d.strftime("%Y-%m-%d")
    return str(d)


def _album_to_out(album: object) -> AlbumOut:
    artist = getattr(album, "artist", None)
    cover = str(getattr(album, "cover", "") or "")
    release_date = getattr(album, "release_date", None)
    # Label — tidalapi may expose it as copyright string or label object
    label: LabelOut | None = None
    label_obj = getattr(album, "label", None)
    if label_obj:
        label = LabelOut(
            id=str(getattr(label_obj, "id", "") or ""),
            name=str(getattr(label_obj, "name", "") or ""),
        )
    elif getattr(album, "copyright", None):
        label = LabelOut(id="", name=str(album.copyright))  # type: ignore[attr-defined]

    return AlbumOut(
        id=str(album.id),  # type: ignore[attr-defined]
        title=str(getattr(album, "name", "") or ""),
        artist=_artist_out(artist) if artist else ArtistOut(id="", name=""),
        cover=cover,
        release_date=_release_date_str(release_date),
        number_of_tracks=int(getattr(album, "num_tracks", 0) or 0),
        duration=int(getattr(album, "duration", 0) or 0),
        audio_quality=_map_audio_quality(getattr(album, "audio_quality", None)),
        audio_modes=_map_audio_modes(getattr(album, "audio_modes", [])),
        upc=getattr(album, "upc", None),
        label=label,
        genre=None,
    )


def _track_to_out(track: object, include_album: bool = True) -> TrackOut:
    artist = getattr(track, "artist", None)
    track_album = getattr(track, "album", None)
    album_dict: dict | None = None
    if include_album and track_album:
        album_dict = {
            "id": str(getattr(track_album, "id", "")),
            "title": str(getattr(track_album, "name", "")),
        }
    return TrackOut(
        id=str(getattr(track, "id", "")),
        title=str(getattr(track, "name", "") or ""),
        track_number=int(getattr(track, "track_num", 1) or 1),
        duration=int(getattr(track, "duration", 0) or 0),
        audio_quality=_map_audio_quality(getattr(track, "audio_quality", None)),
        audio_modes=_map_audio_modes(getattr(track, "audio_modes", [])),
        isrc=getattr(track, "isrc", None),
        artist=_artist_out(artist) if artist else ArtistOut(id="", name=""),
        album=album_dict,
    )


def _playlist_to_out(playlist: object) -> PlaylistOut:
    cover = getattr(playlist, "picture", None) or getattr(playlist, "cover", None)
    return PlaylistOut(
        id=str(getattr(playlist, "id", "")),
        title=str(getattr(playlist, "name", "") or ""),
        number_of_tracks=int(getattr(playlist, "num_tracks", 0) or 0),
        cover=str(cover) if cover else None,
    )


# ─── Repository ───────────────────────────────────────────────────────────────


class SearchV2Repository:
    def search(self, query: str, limit: int, engine: TidalDownloader) -> SearchResultsResponse:
        try:
            raw = engine.session.search(
                query,
                models=[tidalapi.Album, tidalapi.Track, tidalapi.Playlist],
                limit=limit,
            )
        except Exception:
            _empty = lambda: {"items": [], "total": 0}  # noqa: E731
            return SearchResultsResponse(
                albums=PaginatedAlbums(items=[], total_number_of_items=0, limit=limit, offset=0),
                tracks=PaginatedTracks(items=[], total_number_of_items=0, limit=limit, offset=0),
                playlists=PaginatedPlaylists(
                    items=[], total_number_of_items=0, limit=limit, offset=0
                ),
            )

        def _list(key: str) -> list:
            return raw.get(key, []) if isinstance(raw, dict) else list(getattr(raw, key, []) or [])

        album_items = [_album_to_out(a) for a in _list("albums")]
        track_items = [_track_to_out(t) for t in _list("tracks")]
        playlist_items = [_playlist_to_out(p) for p in _list("playlists")]

        return SearchResultsResponse(
            albums=PaginatedAlbums(
                items=album_items,
                total_number_of_items=len(album_items),
                limit=limit,
                offset=0,
            ),
            tracks=PaginatedTracks(
                items=track_items,
                total_number_of_items=len(track_items),
                limit=limit,
                offset=0,
            ),
            playlists=PaginatedPlaylists(
                items=playlist_items,
                total_number_of_items=len(playlist_items),
                limit=limit,
                offset=0,
            ),
        )

    def resolve_url(self, url: str, engine: TidalDownloader) -> ResolveUrlResponse:
        kind, item_id = engine.parse_link(url)
        if not kind or item_id is None:
            raise ValueError(f"URL no reconocida: {url}")

        if kind == "album":
            album = engine.session.album(int(item_id))
            return ResolveUrlResponse(type="album", id=str(item_id), data=_album_to_out(album))
        elif kind == "track":
            track = engine.session.track(int(item_id))
            return ResolveUrlResponse(type="track", id=str(item_id), data=_track_to_out(track))
        elif kind == "playlist":
            playlist = engine.session.playlist(item_id)
            return ResolveUrlResponse(
                type="playlist", id=str(item_id), data=_playlist_to_out(playlist)
            )

        raise ValueError(f"Tipo no soportado: {kind}")

    def get_album_detail(self, album_id: str, engine: TidalDownloader) -> AlbumDetailResponse:
        album = engine.session.album(int(album_id))
        tracks = list(album.tracks())
        album_out = _album_to_out(album)
        track_items = [_track_to_out(t, include_album=False) for t in tracks]
        return AlbumDetailResponse(album=album_out, tracks=track_items)
