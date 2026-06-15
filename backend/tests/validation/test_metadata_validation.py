"""Tests para validación de metadatos embebidos en archivos FLAC."""

from __future__ import annotations

import os
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

import pytest
from mutagen.flac import FLAC

from app.core.metadata import apply_flac_metadata, build_metadata

FFMPEG_AVAILABLE = shutil.which("ffmpeg") is not None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_flac(tmp_path: Path, name: str = "track.flac") -> Path:
    """Genera un FLAC silencioso de 1s (44.1kHz/16bit/stereo) con ffmpeg."""
    path = tmp_path / name
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-t",
            "1",
            "-c:a",
            "flac",
            "-loglevel",
            "error",
            str(path),
        ],
        check=True,
        capture_output=True,
    )
    return path


def _make_cover(tmp_path: Path) -> Path:
    """Genera una portada JPEG válida con ffmpeg."""
    path = tmp_path / "cover.jpg"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=red:s=4x4",
            "-frames:v",
            "1",
            "-loglevel",
            "error",
            str(path),
        ],
        check=True,
        capture_output=True,
    )
    return path


def _make_track(**overrides) -> SimpleNamespace:
    base = dict(
        name="Bohemian Rhapsody",
        track_num=11,
        volume_num=1,
        copyright="(C) 1975 EMI Records Ltd",
        isrc="GBUM71029604",
        bpm=72,
        artist=SimpleNamespace(name="Queen"),
        artists=[SimpleNamespace(name="Queen")],
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def _make_album(**overrides) -> SimpleNamespace:
    base = dict(
        name="A Night at the Opera",
        artist=SimpleNamespace(name="Queen"),
        release_date=datetime(1975, 11, 21),
        copyright="(C) 1975 EMI Records Ltd",
        cover="cover-id",
    )
    base.update(overrides)
    return SimpleNamespace(**base)


# ---------------------------------------------------------------------------
# Validación de tags (sin requerir credenciales de Tidal)
# ---------------------------------------------------------------------------


@pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="ffmpeg no disponible en PATH")
class TestFlacMetadataTagging:
    """Validación de apply_flac_metadata/build_metadata sobre un FLAC local.

    Reproduce el resultado de TidalDownloader.download_single_track sin
    requerir credenciales de Tidal: construye TrackMetadata a partir de
    objetos equivalentes a los expuestos por tidalapi (track/album) y
    aplica los tags al FLAC con mutagen.
    """

    def test_core_tags_written(self, tmp_path):
        flac_path = _make_flac(tmp_path)
        meta = build_metadata(
            track=_make_track(), album=_make_album(), synced_lyrics="", plain_lyrics=""
        )
        meta.comment = "Tidal Rip | 44.1kHz / 16bit"
        apply_flac_metadata(flac_path, meta)

        audio = FLAC(str(flac_path))
        assert audio["TITLE"] == ["Bohemian Rhapsody"]
        assert audio["ARTIST"] == ["Queen"]
        assert audio["ALBUM"] == ["A Night at the Opera"]
        assert audio["ALBUMARTIST"] == ["Queen"]
        assert audio["TRACKNUMBER"] == ["11"]
        assert audio["DISCNUMBER"] == ["1"]

    def test_date_copyright_isrc_bpm_written(self, tmp_path):
        flac_path = _make_flac(tmp_path)
        meta = build_metadata(
            track=_make_track(), album=_make_album(), synced_lyrics="", plain_lyrics=""
        )
        meta.comment = "Tidal Rip | 44.1kHz / 16bit"
        apply_flac_metadata(flac_path, meta)

        audio = FLAC(str(flac_path))
        assert audio["DATE"] == ["1975-11-21"]
        assert audio["COPYRIGHT"] == ["(C) 1975 EMI Records Ltd"]
        assert audio["ISRC"] == ["GBUM71029604"]
        assert audio["BPM"] == ["72"]

    def test_comment_contains_tidal_rip(self, tmp_path):
        flac_path = _make_flac(tmp_path)
        meta = build_metadata(
            track=_make_track(), album=_make_album(), synced_lyrics="", plain_lyrics=""
        )
        meta.comment = "Tidal Rip | 44.1kHz / 16bit"
        apply_flac_metadata(flac_path, meta)

        audio = FLAC(str(flac_path))
        assert "Tidal Rip" in audio["COMMENT"][0]

    def test_cover_art_embedded(self, tmp_path):
        flac_path = _make_flac(tmp_path)
        cover_path = _make_cover(tmp_path)
        meta = build_metadata(
            track=_make_track(),
            album=_make_album(),
            synced_lyrics="",
            plain_lyrics="",
            cover_path=cover_path,
        )
        meta.comment = "Tidal Rip | 44.1kHz / 16bit"
        apply_flac_metadata(flac_path, meta)

        audio = FLAC(str(flac_path))
        assert len(audio.pictures) == 1
        picture = audio.pictures[0]
        assert picture.type == 3
        assert picture.mime == "image/jpeg"
        assert len(picture.data) > 0

    def test_synced_lyrics_embedded_in_lyrics_fields(self, tmp_path):
        flac_path = _make_flac(tmp_path)
        synced = "[00:00.00]Is this the real life"
        meta = build_metadata(
            track=_make_track(),
            album=_make_album(),
            synced_lyrics=synced,
            plain_lyrics="",
        )
        meta.comment = "Tidal Rip | 44.1kHz / 16bit"
        apply_flac_metadata(flac_path, meta)

        audio = FLAC(str(flac_path))
        assert audio["LYRICS"] == [synced]
        assert audio["UNSYNCEDLYRICS"] == [synced]

    def test_plain_lyrics_embedded_when_no_synced(self, tmp_path):
        flac_path = _make_flac(tmp_path)
        plain = "Is this the real life\nIs this just fantasy"
        meta = build_metadata(
            track=_make_track(),
            album=_make_album(),
            synced_lyrics="",
            plain_lyrics=plain,
        )
        meta.comment = "Tidal Rip | 44.1kHz / 16bit"
        apply_flac_metadata(flac_path, meta)

        audio = FLAC(str(flac_path))
        assert audio["LYRICS"] == [plain]
        assert audio["UNSYNCEDLYRICS"] == [plain]


# ---------------------------------------------------------------------------
# Descarga real de un track con metadatos completos (E2E contra Tidal)
# ---------------------------------------------------------------------------

# Track de referencia con ISRC/copyright conocidos.
# Configurable vía TIDAL_TEST_TRACK_ID para usar un track alternativo válido.
REFERENCE_TRACK_ID = int(os.environ.get("TIDAL_TEST_TRACK_ID") or "77640396")


@pytest.mark.slow
class TestRealTrackMetadata:
    """Descarga un track real y valida sus metadatos embebidos.

    Requiere TIDAL_TEST_ACCESS_TOKEN / TIDAL_TEST_REFRESH_TOKEN (ver fixture
    `tidal_session`); de lo contrario se omite.
    """

    def test_downloaded_track_has_expected_metadata(self, tidal_session, temp_download_dir):
        from tidalapi.media import Quality

        from app.core.tidal import TidalDownloader

        downloader = TidalDownloader(log_callback=lambda *a, **k: None, session_data=tidal_session)
        downloader.quality = Quality.high_lossless
        try:
            assert downloader.check_auth(), "La sesión de prueba de Tidal no es válida"

            track = downloader.session.track(REFERENCE_TRACK_ID)
            ok, path, quality_text, sample_rate, bit_depth = downloader.download_single_track(
                track, folder_name="qa-metadata"
            )
            assert ok, f"La descarga falló: {path}"

            audio = FLAC(path)

            for tag in ("TITLE", "ARTIST", "ALBUM", "ALBUMARTIST", "TRACKNUMBER", "DISCNUMBER"):
                assert tag in audio, f"Falta el tag {tag}"
                assert audio[tag][0].strip() != ""

            assert "DATE" in audio
            assert "COMMENT" in audio
            assert "Tidal Rip" in audio["COMMENT"][0]

            if getattr(track, "isrc", None):
                assert "ISRC" in audio
                assert audio["ISRC"][0] == track.isrc

            if getattr(track, "copyright", None) or getattr(track.album, "copyright", None):
                assert "COPYRIGHT" in audio

            # Portada incrustada (tipo 3 = front cover, JPEG, no vacía)
            assert len(audio.pictures) == 1
            picture = audio.pictures[0]
            assert picture.type == 3
            assert picture.mime == "image/jpeg"
            assert len(picture.data) > 0

            # Letras sincronizadas (LYRICS) o planas (UNSYNCEDLYRICS), si LRCLib las tiene
            if "LYRICS" in audio or "UNSYNCEDLYRICS" in audio:
                lyrics = audio.get("LYRICS", audio.get("UNSYNCEDLYRICS"))[0]
                assert lyrics.strip() != ""
        finally:
            downloader._cleanup_temp_dir()
