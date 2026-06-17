from app.core.tidal import TidalDownloader


class DownloadRepository:
    def prepare(self, url: str, engine: TidalDownloader):
        """Parsea la URL y obtiene tracks desde Tidal (bloqueante, corre en thread)."""
        kind, item_id = engine.parse_link(url)
        if not kind or not item_id:
            raise ValueError("URL de Tidal no reconocida")

        if kind == "track":
            track = engine.session.track(item_id)  # type: ignore[arg-type]  # tidalapi stubs declare str but accepts int/str
            tracks = [track]
            title = track.name or ""
            artist_name = track.artist.name if track.artist else "Unknown"
            album_name = track.album.name if track.album else "Unknown"
            folder = engine._sanitize_filename(f"{artist_name} - {album_name}")
        elif kind == "album":
            album = engine.session.album(item_id)  # type: ignore[arg-type]  # tidalapi stubs declare str but accepts int/str
            tracks = list(album.tracks())
            year = album.release_date.year if album.release_date else ""
            title = album.name or ""
            artist_name = album.artist.name if album.artist else "Unknown"
            folder = engine._sanitize_filename(f"{artist_name} - [{year}] {album.name or ''}")
        elif kind == "playlist":
            playlist = engine.session.playlist(item_id)
            tracks = list(playlist.tracks(limit=None))
            title = playlist.name or ""
            folder = engine._sanitize_filename(f"Playlist - {playlist.name or ''}")
        else:
            raise ValueError(f"Tipo no soportado: {kind}")

        if not tracks:
            raise ValueError("No se encontraron tracks")

        return kind, item_id, tracks, title, folder
