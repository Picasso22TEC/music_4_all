from app.core.tidal import TidalDownloader


class DownloadRepository:
    def prepare(self, url: str, engine: TidalDownloader):
        """Parsea la URL y obtiene tracks desde Tidal (bloqueante, corre en thread)."""
        kind, item_id = engine.parse_link(url)
        if not kind or not item_id:
            raise ValueError("URL de Tidal no reconocida")

        if kind == "track":
            track = engine.session.track(item_id)
            tracks = [track]
            title = track.name
            folder = engine._sanitize_filename(f"{track.artist.name} - {track.album.name}")
        elif kind == "album":
            album = engine.session.album(item_id)
            tracks = list(album.tracks())
            year = album.release_date.year if album.release_date else ""
            title = album.name
            folder = engine._sanitize_filename(
                f"{album.artist.name} - [{year}] {album.name}"
            )
        elif kind == "playlist":
            playlist = engine.session.playlist(item_id)
            tracks = list(playlist.tracks(limit=None))
            title = playlist.name
            folder = engine._sanitize_filename(f"Playlist - {playlist.name}")
        else:
            raise ValueError(f"Tipo no soportado: {kind}")

        if not tracks:
            raise ValueError("No se encontraron tracks")

        return kind, item_id, tracks, title, folder
