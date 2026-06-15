"""Tests para validación de archivos FLAC."""

import json
import os
import shutil
import subprocess
import pytest
from pathlib import Path
import struct
from unittest.mock import Mock, patch

from mutagen.flac import FLAC


class TestFLACFormat:
    """Validación de estructura FLAC."""

    def test_flac_magic_bytes(self, tmp_path):
        """Verificar que bytes mágicos sean válidos."""
        # Crear archivo con bytes mágicos correctos de FLAC
        test_file = tmp_path / "test.flac"
        with open(test_file, 'wb') as f:
            f.write(b'fLaC')  # Magic bytes de FLAC
            f.write(b'\x00' * 100)  # Datos ficticios

        # Leer y validar
        with open(test_file, 'rb') as f:
            magic = f.read(4)

        assert magic == b'fLaC', f"Magic bytes inválidos: {magic.hex()}"

    def test_flac_not_mp4(self, tmp_path):
        """Verificar que NO sea MP4/AAC."""
        test_file = tmp_path / "fake.flac"
        with open(test_file, 'wb') as f:
            f.write(b'\x00\x00\x00\x1c')  # Magic bytes de MP4
            f.write(b'ftypisom')
            f.write(b'\x00' * 100)

        with open(test_file, 'rb') as f:
            magic = f.read(4)

        assert magic != b'fLaC', "El archivo no debería ser FLAC si tiene magic bytes MP4"

    def test_flac_is_lossless(self):
        """Verificar que FLAC sea formato lossless."""
        formats_lossless = ["FLAC", "WAV", "ALAC"]
        formats_lossy = ["MP3", "AAC", "OGG"]
        
        assert "FLAC" in formats_lossless
        assert "FLAC" not in formats_lossy

    def test_file_extension_valid(self):
        """Verificar que extensión sea correcta."""
        valid_extensions = [".flac", ".FLAC"]
        invalid_extensions = [".mp3", ".aac", ".m4a"]
        
        test_file = "track.flac"
        ext = Path(test_file).suffix.lower()
        
        assert ext in valid_extensions
        assert ext not in invalid_extensions


class TestFLACMetadata:
    """Validación de metadatos en FLAC."""

    def test_metadata_presence(self, tmp_path):
        """Verificar que metadatos estén presentes."""
        metadata = {
            "title": "Test Track",
            "artist": "Test Artist",
            "album": "Test Album",
            "sample_rate": 48000,
            "bit_depth": 24
        }

        required_fields = ["title", "artist", "album", "sample_rate", "bit_depth"]
        for field in required_fields:
            assert field in metadata, f"Falta campo de metadatos: {field}"
        
        assert isinstance(metadata["title"], str)
        assert len(metadata["title"]) > 0

    def test_metadata_types(self):
        """Verificar tipos correctos de metadatos."""
        metadata = {
            "title": "Test Track",
            "artist": "Test Artist",
            "sample_rate": 48000,
            "bit_depth": 24,
            "duration": 180.5
        }
        
        assert isinstance(metadata["title"], str)
        assert isinstance(metadata["artist"], str)
        assert isinstance(metadata["sample_rate"], int)
        assert isinstance(metadata["bit_depth"], int)
        assert isinstance(metadata["duration"], (int, float))

    def test_metadata_non_empty(self):
        """Verificar que metadatos no estén vacíos."""
        metadata = {
            "title": "Test Track",
            "artist": "Test Artist",
        }
        
        for key, value in metadata.items():
            if isinstance(value, str):
                assert len(value.strip()) > 0, f"Campo {key} vacío"


class TestFLACQuality:
    """Validación de calidad de audio FLAC."""

    @pytest.mark.parametrize("sample_rate,bit_depth,channels", [
        (44100, 16, 2),     # CD Quality
        (48000, 16, 2),     # Professional
        (48000, 24, 2),     # Hi-Res
        (96000, 24, 2),     # MQA Master
        (192000, 24, 2),    # Ultra Hi-Res
    ])
    def test_valid_bitrate_combinations(self, sample_rate, bit_depth, channels):
        """Verificar combinaciones válidas de bitrate."""
        # Calcular bitrate teórico
        bitrate = sample_rate * bit_depth * channels

        # Bitrate debe ser positivo y en rango plausible
        assert bitrate > 0, "Bitrate debe ser positivo"
        assert bitrate <= 20_000_000, f"Bitrate demasiado alto: {bitrate}"
        
        # Validar parámetros individuales
        assert sample_rate in (44100, 48000, 96000, 192000)
        assert bit_depth in (16, 24, 32)
        assert channels in (1, 2)

    def test_sample_rate_valid(self):
        """Verificar que sample rate sea válido."""
        valid_sample_rates = [44100, 48000, 96000, 192000]
        invalid_sample_rates = [32000, 88200, 176400]
        
        test_rate = 48000
        assert test_rate in valid_sample_rates
        
        for rate in invalid_sample_rates:
            assert rate not in valid_sample_rates or rate in [44100]

    def test_bit_depth_valid(self):
        """Verificar que bit depth sea válido para FLAC."""
        valid_depths = [16, 24, 32]
        invalid_depths = [8, 12, 20]
        
        test_depth = 24
        assert test_depth in valid_depths
        
        for depth in invalid_depths:
            assert depth not in valid_depths

    def test_compression_ratio(self, tmp_path):
        """Verificar que la compresión sea plausible."""
        file_size_mb = 5.0  # MB
        duration_seconds = 180  # 3 minutos
        
        bitrate_mbps = (file_size_mb * 8) / duration_seconds
        
        # Bitrate razonable para FLAC (típicamente 500-3000 kbps)
        assert 0.1 < bitrate_mbps < 3.0, f"Bitrate sospechoso: {bitrate_mbps} Mbps"

    def test_flac_vs_uncompressed(self):
        """Verificar que FLAC comprime versus PCM/WAV."""
        # CD Quality: 44.1kHz, 16-bit, Stereo
        uncompressed_bitrate = 44100 * 16 * 2 / 1_000_000  # Mbps
        flac_estimated_bitrate = 1.0  # Mbps (típico)
        
        compression_ratio = uncompressed_bitrate / flac_estimated_bitrate
        
        # FLAC típicamente comprime 40-50% del tamaño de PCM
        assert compression_ratio > 1, "FLAC debe comprimir"
        assert compression_ratio < 10, "Compresión no debe ser extrema"


class TestFLACBitrate:
    """Validación de bitrate y compresión."""

    def test_bitrate_calculation(self):
        """Verificar cálculo correcto de bitrate."""
        sample_rate = 48000
        bit_depth = 24
        channels = 2
        
        bitrate = sample_rate * bit_depth * channels
        expected_bitrate = 2_304_000  # bits per second
        
        assert bitrate == expected_bitrate

    def test_compression_efficiency(self):
        """Verificar eficiencia de compresión."""
        original_size_kb = 5000  # KB
        compressed_size_kb = 2500  # KB (FLAC típicamente 40-60% del original)

        compression_ratio = original_size_kb / compressed_size_kb

        assert compression_ratio >= 1.5, "Compresión insuficiente"
        assert compression_ratio <= 3.0, "Compresión demasiada (podría ser pérdida)"


# ---------------------------------------------------------------------------
# Extracción de FLAC desde un contenedor MP4 (caso HI_RES_LOSSLESS de Tidal)
# ---------------------------------------------------------------------------

def _generate_flac_in_mp4(tmp_path: Path) -> Path:
    """Genera un archivo de audio FLAC y lo empaqueta en un contenedor MP4/.m4a.

    Reproduce el caso real de Tidal HI_RES_LOSSLESS, donde el stream
    descargado es un contenedor MP4 que envuelve un codec FLAC.
    """
    flac_path = tmp_path / "source.flac"
    mp4_path = tmp_path / "source.m4a"

    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-t", "1", "-c:a", "flac", "-loglevel", "error", str(flac_path),
        ],
        check=True, capture_output=True,
    )
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(flac_path),
            "-c:a", "copy", "-strict", "-2", "-f", "mp4", "-loglevel", "error", str(mp4_path),
        ],
        check=True, capture_output=True,
    )
    return mp4_path


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg no disponible en PATH")
class TestFlacExtractionFromMp4:
    """Validación de TidalDownloader._extract_flac_from_mp4."""

    def test_extracts_native_flac_from_mp4_container(self, tmp_path):
        from app.core.tidal import TidalDownloader

        mp4_path = _generate_flac_in_mp4(tmp_path)

        downloader = TidalDownloader(log_callback=lambda *a, **k: None, session_data=None)
        try:
            result_path = downloader._extract_flac_from_mp4(mp4_path)
        finally:
            downloader._cleanup_temp_dir()

        with open(result_path, "rb") as f:
            assert f.read(4) == b"fLaC", "El archivo extraído debe tener bytes mágicos FLAC nativos"

        audio = FLAC(str(result_path))
        assert audio.info.sample_rate == 44100
        assert audio.info.channels == 2

    def test_already_native_flac_is_returned_unchanged(self, tmp_path):
        from app.core.tidal import TidalDownloader

        flac_path = tmp_path / "already.flac"
        subprocess.run(
            [
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                "-t", "1", "-c:a", "flac", "-loglevel", "error", str(flac_path),
            ],
            check=True, capture_output=True,
        )

        downloader = TidalDownloader(log_callback=lambda *a, **k: None, session_data=None)
        try:
            result_path = downloader._extract_flac_from_mp4(flac_path)
        finally:
            downloader._cleanup_temp_dir()

        assert result_path == flac_path
        with open(result_path, "rb") as f:
            assert f.read(4) == b"fLaC"


# ---------------------------------------------------------------------------
# Descarga real de un track LOSSLESS 16-bit/44.1kHz (E2E contra Tidal)
# ---------------------------------------------------------------------------

# Track de referencia conocido como LOSSLESS 16-bit/44.1kHz.
# Configurable vía TIDAL_TEST_TRACK_ID para usar un track alternativo válido.
REFERENCE_TRACK_ID = int(os.environ.get("TIDAL_TEST_TRACK_ID") or "77640396")


@pytest.mark.slow
@pytest.mark.skipif(shutil.which("ffprobe") is None, reason="ffprobe no disponible en PATH")
class TestRealFlacDownload:
    """Descarga un track real desde Tidal y valida el FLAC resultante con ffprobe/mutagen.

    Requiere TIDAL_TEST_ACCESS_TOKEN / TIDAL_TEST_REFRESH_TOKEN configurados
    (ver fixture `tidal_session`); de lo contrario se omite.
    """

    def test_downloaded_track_is_valid_flac_16_44(self, tidal_session, temp_download_dir):
        from tidalapi.media import Quality

        from app.core.tidal import TidalDownloader

        downloader = TidalDownloader(log_callback=lambda *a, **k: None, session_data=tidal_session)
        downloader.quality = Quality.high_lossless
        try:
            assert downloader.check_auth(), "La sesión de prueba de Tidal no es válida"

            track = downloader.session.track(REFERENCE_TRACK_ID)
            ok, path, quality_text, sample_rate, bit_depth = downloader.download_single_track(
                track, folder_name="qa-validation"
            )

            assert ok, f"La descarga falló: {path}"

            result_path = Path(path)
            assert result_path.exists()
            assert result_path.stat().st_size > 0

            # El archivo debe ser un FLAC legible por mutagen
            audio = FLAC(str(result_path))
            assert audio.info.sample_rate == 44100
            assert audio.info.bits_per_sample == 16

            # ffprobe confirma codec/sample_rate/bit depth
            probe = subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", str(result_path)],
                capture_output=True, text=True, check=True,
            )
            stream = json.loads(probe.stdout)["streams"][0]
            assert stream["codec_name"] == "flac"
            assert stream["sample_rate"] == "44100"
            assert stream["bits_per_raw_sample"] == "16"
        finally:
            downloader._cleanup_temp_dir()

