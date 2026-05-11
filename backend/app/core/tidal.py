"""Lógica principal de descarga de Tidal."""

from __future__ import annotations

from typing import Any


class TidalDownloader:
    """Gestor de descargas de Tidal."""

    def __init__(self, session_data: dict[str, Any] | None = None):
        self.session_data = session_data or {}
        self.authenticated = bool(self.session_data)

    def check_auth(self) -> bool:
        """Indica si el motor tiene sesión válida disponible."""
        return self.authenticated

    def set_session(self, session_data: dict[str, Any]) -> None:
        """Actualiza la sesión activa del motor."""
        self.session_data = session_data
        self.authenticated = True

    async def authenticate(self, token: str):
        """Autenticar con Tidal."""
        self.set_session({"access_token": token})
        return {"status": "authenticated"}

    async def get_metadata(self, url: str) -> dict[str, Any]:
        """Resolver metadatos de un recurso de Tidal."""
        return {
            "type": "track",
            "title": "Track",
            "artist": "Artist",
            "album": "Album",
            "items": [],
            "folder": "Artist - Album",
            "year": "2026",
            "quality_badge": "HIFI",
            "quality_desc": "44.1kHz / 16bit",
            "tracks_count": 0,
            "audio_format": "FLAC",
            "source_url": url,
        }

    async def download_track(self, track_id: str):
        """Descargar una canción."""
        return {"track_id": track_id, "status": "queued"}
