"""Fixtures reutilizables para todas las pruebas."""

import os
from datetime import datetime, timedelta

import pytest
from unittest.mock import Mock, MagicMock
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def api_client():
    """Cliente HTTP para pruebas de FastAPI."""
    return TestClient(app)


@pytest.fixture
def temp_download_dir(tmp_path):
    """Directorio temporal aislado para pruebas que escriben archivos descargados."""
    return tmp_path


@pytest.fixture
def tidal_session():
    """Datos de sesión Tidal real, cargados desde variables de entorno.

    Se usa en pruebas marcadas con @pytest.mark.slow que requieren descargar
    contenido real desde Tidal. Si las credenciales no están configuradas,
    la prueba se omite (skip) en lugar de fallar.
    """
    access_token = os.environ.get("TIDAL_TEST_ACCESS_TOKEN")
    refresh_token = os.environ.get("TIDAL_TEST_REFRESH_TOKEN")

    if not access_token or not refresh_token:
        pytest.skip(
            "TIDAL_TEST_ACCESS_TOKEN / TIDAL_TEST_REFRESH_TOKEN no configurados: "
            "se omite la prueba que requiere una sesión real de Tidal."
        )

    expiry_time = os.environ.get("TIDAL_TEST_EXPIRY_TIME")
    if not expiry_time:
        expiry_time = (datetime.now() + timedelta(hours=1)).isoformat()

    return {
        "token_type": os.environ.get("TIDAL_TEST_TOKEN_TYPE") or "Bearer",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expiry_time": expiry_time,
    }


@pytest.fixture
def tidal_session_mock():
    """Sesión de Tidal simulada."""
    session = Mock()
    session.check_login.return_value = True
    session.token_type = "Bearer"
    session.access_token = "test_token_12345"
    session.refresh_token = "test_refresh_67890"
    return session


@pytest.fixture
def sample_track():
    """Track de prueba."""
    track = Mock()
    track.id = 123456789
    track.name = "Test Track"
    track.artist = Mock(name="Test Artist")
    track.album = Mock(id=987654321, name="Test Album")
    track.track_num = 1
    track.duration = 180
    return track


@pytest.fixture
def sample_album():
    """Album de prueba."""
    album = Mock()
    album.id = 987654321
    album.name = "Test Album"
    album.artist = Mock(name="Test Artist")
    album.num_tracks = 10
    album.release_date = "2023-01-01"
    album.cover = "test-cover-id"
    return album


@pytest.fixture
def sample_metadata():
    """Metadata simulada de API."""
    return {
        "type": "track",
        "title": "Test Track",
        "artist": "Test Artist",
        "items": [
            {
                "id": 123456789,
                "name": "Test Track",
                "artist": {"name": "Test Artist"},
                "album": {"id": 987654321}
            }
        ],
        "folder": "Test Artist - Test Album",
        "year": "2023",
        "quality_badge": "HIFI",
        "quality_desc": "44.1kHz / 16bit"
    }


@pytest.fixture
def sample_download_job():
    """Job de descarga simulado."""
    return {
        "job_id": "job-test-12345",
        "status": "downloading",
        "progress": 0.45,
        "queue_position": 2,
        "eta_seconds": 120.5,
        "result_path": None,
        "quality_text": "FLAC 48kHz/24bit",
        "sample_rate": 48000,
        "bit_depth": 24,
        "error": None
    }
