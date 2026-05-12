"""
Metadatos avanzados para FLAC.
"""
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime
from typing import Optional, List
import logging

from mutagen.flac import FLAC as MutagenFLAC, Picture

log = logging.getLogger(__name__)


@dataclass(slots=True)
class TrackMetadata:
    title: str
    track_number: str
    disc_number: str
    copyright: str = ""
    album_artist: str = ""
    artists: List[str] = field(default_factory=list)
    album_title: str = ""
    date: str = ""
    isrc: str = ""
    bpm: str = ""
    lyrics: str = ""
    cover_data: Optional[bytes] = None
    comment: str = ""


def build_metadata(track, album, synced_lyrics="", plain_lyrics="", cover_path: Optional[Path] = None) -> TrackMetadata:
    """Construye un objeto TrackMetadata desde los datos de Tidal."""

    title = track.name
    if hasattr(track, 'version') and track.version:
        title = f"{title} ({track.version})"

    artist_names = []
    if hasattr(track, 'artists') and track.artists:
        artist_names = sorted(a.name.strip() for a in track.artists)
    elif track.artist and track.artist.name:
        artist_names = [track.artist.name.strip()]

    album_artist = ""
    if hasattr(album, 'artist') and album.artist and album.artist.name:
        album_artist = album.artist.name.strip()
    elif artist_names:
        album_artist = artist_names[0]

    date_str = ""
    if album.release_date:
        if isinstance(album.release_date, datetime):
            date_str = album.release_date.strftime("%Y-%m-%d")
        else:
            date_str = str(album.release_date)

    lyrics = synced_lyrics or plain_lyrics or ""

    cover_data = None
    if cover_path and cover_path.exists():
        try:
            cover_data = cover_path.read_bytes()
        except Exception as e:
            log.warning(f"No se pudo leer la portada: {e}")

    return TrackMetadata(
        title=title,
        track_number=str(track.track_num) if track.track_num else "1",
        disc_number=str(getattr(track, 'volume_num', 1) or 1),
        copyright=getattr(track, 'copyright', '') or getattr(album, 'copyright', '') or '',
        album_artist=album_artist,
        artists=artist_names,
        album_title=album.name if album.name else "",
        date=date_str,
        isrc=getattr(track, 'isrc', '') or '',
        bpm=str(getattr(track, 'bpm', '') or ''),
        lyrics=lyrics,
        cover_data=cover_data,
    )


def apply_flac_metadata(file_path: Path, metadata: TrackMetadata) -> None:
    """Escribe metadatos en un FLAC existente, sin recodificar."""
    audio = MutagenFLAC(str(file_path))
    audio.delete()

    audio['TITLE'] = [metadata.title]
    audio['ARTIST'] = metadata.artists
    audio['ALBUM'] = [metadata.album_title]
    audio['ALBUMARTIST'] = [metadata.album_artist]
    audio['TRACKNUMBER'] = [metadata.track_number]
    audio['DISCNUMBER'] = [metadata.disc_number]
    audio['TRACKTOTAL'] = [str(audio.info.total_samples) if hasattr(audio.info, 'total_samples') else "1"]
    audio['DISCTOTAL'] = [metadata.disc_number]

    if metadata.copyright:
        audio['COPYRIGHT'] = [metadata.copyright]
    if metadata.date:
        audio['DATE'] = [metadata.date]
        try:
            year = datetime.fromisoformat(metadata.date).year
            audio['YEAR'] = [str(year)]
        except Exception:
            pass
    if metadata.isrc:
        audio['ISRC'] = [metadata.isrc]
    if metadata.bpm:
        audio['BPM'] = [metadata.bpm]
    if metadata.lyrics:
        audio['LYRICS'] = [metadata.lyrics]
        audio['UNSYNCEDLYRICS'] = [metadata.lyrics]

    audio['COMMENT'] = [metadata.comment]

    if metadata.cover_data:
        try:
            picture = Picture()
            picture.type = 3
            picture.mime = 'image/jpeg'
            picture.data = metadata.cover_data
            audio.add_picture(picture)
        except Exception as e:
            log.warning(f"No se pudo añadir portada: {e}")

    audio.save()