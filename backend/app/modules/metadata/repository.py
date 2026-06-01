import tidalapi

from app.core.tidal import TidalDownloader

from .schemas import SearchResult


def _cover_url(cover_id: str | None, size: int = 320) -> str | None:
    if not cover_id:
        return None
    return f"https://resources.tidal.com/images/{cover_id.replace('-', '/')}/{size}x{size}.jpg"


class MetadataRepository:
    def search(self, query: str, limit: int, engine: TidalDownloader) -> list[SearchResult]:
        results: list[SearchResult] = []
        try:
            raw = engine.session.search(
                query,
                models=[tidalapi.Album, tidalapi.Track, tidalapi.Playlist],
                limit=limit,
            )
        except Exception:
            return results

        # Albums
        albums = raw.get("albums", []) if isinstance(raw, dict) else getattr(raw, "albums", [])
        for album in albums:
            artist = getattr(album, "artist", None)
            results.append(
                SearchResult(
                    id=str(album.id),
                    title=album.name,
                    artist=getattr(artist, "name", "") if artist else "",
                    url=f"https://tidal.com/browse/album/{album.id}",
                    cover_url=_cover_url(getattr(album, "cover", None)),
                    type="album",
                )
            )

        # Tracks
        tracks = raw.get("tracks", []) if isinstance(raw, dict) else getattr(raw, "tracks", [])
        for track in tracks:
            artist = getattr(track, "artist", None)
            album = getattr(track, "album", None)
            cover = getattr(album, "cover", None) if album else None
            results.append(
                SearchResult(
                    id=str(track.id),
                    title=track.name,
                    artist=getattr(artist, "name", "") if artist else "",
                    url=f"https://tidal.com/browse/track/{track.id}",
                    cover_url=_cover_url(cover),
                    type="track",
                )
            )

        # Playlists
        playlists = raw.get("playlists", []) if isinstance(raw, dict) else getattr(raw, "playlists", [])
        for playlist in playlists:
            results.append(
                SearchResult(
                    id=str(playlist.id),
                    title=playlist.name,
                    artist="Playlist",
                    url=f"https://tidal.com/browse/playlist/{playlist.id}",
                    cover_url=_cover_url(getattr(playlist, "picture", None)),
                    type="playlist",
                )
            )

        return results
