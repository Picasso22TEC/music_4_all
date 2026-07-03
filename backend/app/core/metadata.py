"""
Metadatos avanzados para FLAC y M4A/AAC.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from mutagen.flac import FLAC as MutagenFLAC
from mutagen.flac import Picture
from mutagen.mp4 import MP4, MP4Cover

log = logging.getLogger(__name__)


@dataclass(slots=True)
class TrackMetadata:
    title: str
    track_number: str
    disc_number: str
    copyright: str = ""
    album_artist: str = ""
    artists: list[str] = field(default_factory=list)
    album_title: str = ""
    date: str = ""
    isrc: str = ""
    bpm: str = ""
    lyrics: str = ""
    cover_data: bytes | None = None
    comment: str = ""


def build_metadata(
    track, album, synced_lyrics="", plain_lyrics="", cover_path: Path | None = None
) -> TrackMetadata:
    """Construye un objeto TrackMetadata desde los datos de Tidal."""

    title = track.name
    if hasattr(track, "version") and track.version:
        title = f"{title} ({track.version})"

    artist_names = []
    if hasattr(track, "artists") and track.artists:
        artist_names = sorted(a.name.strip() for a in track.artists)
    elif track.artist and track.artist.name:
        artist_names = [track.artist.name.strip()]

    album_artist = ""
    if hasattr(album, "artist") and album.artist and album.artist.name:
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
        disc_number=str(getattr(track, "volume_num", 1) or 1),
        copyright=getattr(track, "copyright", "") or getattr(album, "copyright", "") or "",
        album_artist=album_artist,
        artists=artist_names,
        album_title=album.name if album.name else "",
        date=date_str,
        isrc=getattr(track, "isrc", "") or "",
        bpm=str(getattr(track, "bpm", "") or ""),
        lyrics=lyrics,
        cover_data=cover_data,
    )


def apply_flac_metadata(file_path: Path, metadata: TrackMetadata) -> None:
    """Escribe metadatos en un FLAC existente, sin recodificar."""
    audio = MutagenFLAC(str(file_path))
    audio.delete()

    audio["TITLE"] = [metadata.title]
    audio["ARTIST"] = metadata.artists
    audio["ALBUM"] = [metadata.album_title]
    audio["ALBUMARTIST"] = [metadata.album_artist]
    audio["TRACKNUMBER"] = [metadata.track_number]
    audio["DISCNUMBER"] = [metadata.disc_number]
    audio["TRACKTOTAL"] = [
        str(audio.info.total_samples) if hasattr(audio.info, "total_samples") else "1"
    ]
    audio["DISCTOTAL"] = [metadata.disc_number]

    if metadata.copyright:
        audio["COPYRIGHT"] = [metadata.copyright]
    if metadata.date:
        audio["DATE"] = [metadata.date]
        try:
            year = datetime.fromisoformat(metadata.date).year
            audio["YEAR"] = [str(year)]
        except Exception:
            pass
    if metadata.isrc:
        audio["ISRC"] = [metadata.isrc]
    if metadata.bpm:
        audio["BPM"] = [metadata.bpm]
    if metadata.lyrics:
        audio["LYRICS"] = [metadata.lyrics]
        audio["UNSYNCEDLYRICS"] = [metadata.lyrics]

    audio["COMMENT"] = [metadata.comment]

    if metadata.cover_data:
        try:
            picture = Picture()
            picture.type = 3
            picture.mime = "image/jpeg"
            picture.data = metadata.cover_data
            audio.add_picture(picture)
        except Exception as e:
            log.warning(f"No se pudo añadir portada: {e}")

    audio.save()


def apply_m4a_metadata(file_path: Path, metadata: TrackMetadata) -> None:
    """Escribe metadatos en un M4A/AAC existente (mutagen.mp4), sin recodificar.

    Contraparte de :func:`apply_flac_metadata` para el tier lossy (NORMAL/AAC).
    Reutiliza el mismo :class:`TrackMetadata` que produce ``build_metadata`` y solo
    cambia el *writer* (átomos iTunes en lugar de comentarios Vorbis).
    """
    audio = MP4(str(file_path))
    audio.delete()

    # Átomos iTunes: '\xa9' es el prefijo © de los atoms de texto estándar.
    audio["\xa9nam"] = [metadata.title]
    if metadata.artists:
        audio["\xa9ART"] = metadata.artists
    if metadata.album_artist:
        audio["aART"] = [metadata.album_artist]
    if metadata.album_title:
        audio["\xa9alb"] = [metadata.album_title]

    try:
        track_no = int(metadata.track_number)
    except (TypeError, ValueError):
        track_no = 1
    audio["trkn"] = [(track_no, 0)]

    try:
        disc_no = int(metadata.disc_number)
    except (TypeError, ValueError):
        disc_no = 1
    audio["disk"] = [(disc_no, 0)]

    if metadata.copyright:
        audio["cprt"] = [metadata.copyright]
    if metadata.date:
        audio["\xa9day"] = [metadata.date]
    if metadata.isrc:
        audio["----:com.apple.iTunes:ISRC"] = [metadata.isrc.encode("utf-8")]
    if metadata.bpm:
        try:
            audio["tmpo"] = [int(float(metadata.bpm))]
        except (TypeError, ValueError):
            pass
    if metadata.lyrics:
        audio["\xa9lyr"] = [metadata.lyrics]
    if metadata.comment:
        audio["\xa9cmt"] = [metadata.comment]

    if metadata.cover_data:
        try:
            audio["covr"] = [MP4Cover(metadata.cover_data, imageformat=MP4Cover.FORMAT_JPEG)]
        except Exception as e:
            log.warning(f"No se pudo añadir portada M4A: {e}")

    audio.save()
