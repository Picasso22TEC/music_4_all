"""Fixtures reutilizables para todas las pruebas."""

import os
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, Mock

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def api_client():
    """Cliente HTTP para pruebas de FastAPI."""
    return TestClient(app)


@pytest.fixture
def api_client_with_state():
    """Cliente HTTP de FastAPI con `app.state`/dependencias de auth mockeadas.

    `api_client` crea un `TestClient(app)` sin usarlo como context manager, por lo
    que el `lifespan` de la app nunca se ejecuta y `app.state.engine` /
    `app.state.redis` / `app.state.engine_registry` no existen (`AttributeError`).
    Este fixture inicializa mocks mínimos para esos atributos y, tras la migración
    multiusuario, **sobrescribe** las dependencias `get_current_user` /
    `get_authenticated_engine` (que en producción exigen la cookie de sesión) para
    que las pruebas de endpoints sigan usando el motor mockeado sin cookie real.
    Restaura estado y overrides al finalizar.
    """
    from app.dependencies import (
        CurrentUser,
        get_authenticated_engine,
        get_current_user,
        get_current_user_optional,
    )

    had_engine = hasattr(app.state, "engine")
    had_redis = hasattr(app.state, "redis")
    had_registry = hasattr(app.state, "engine_registry")
    prev_engine = getattr(app.state, "engine", None)
    prev_redis = getattr(app.state, "redis", None)
    prev_registry = getattr(app.state, "engine_registry", None)

    engine_mock = MagicMock()
    engine_mock.check_auth.return_value = True

    redis_mock = MagicMock()
    redis_mock.get = AsyncMock(return_value=None)

    registry_mock = MagicMock()
    registry_mock.get = AsyncMock(return_value=engine_mock)
    registry_mock.get_authenticated = AsyncMock(return_value=engine_mock)
    registry_mock.acquire = AsyncMock(return_value=engine_mock)
    registry_mock.release = AsyncMock()

    app.state.engine = engine_mock
    app.state.redis = redis_mock
    app.state.engine_registry = registry_mock

    test_user = CurrentUser(tidal_user_id="test-user", sid="test-sid")
    app.dependency_overrides[get_authenticated_engine] = lambda: engine_mock
    app.dependency_overrides[get_current_user] = lambda: test_user
    app.dependency_overrides[get_current_user_optional] = lambda: test_user

    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_authenticated_engine, None)
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_current_user_optional, None)
        if had_engine:
            app.state.engine = prev_engine
        else:
            del app.state.engine
        if had_redis:
            app.state.redis = prev_redis
        else:
            del app.state.redis
        if had_registry:
            app.state.engine_registry = prev_registry
        else:
            del app.state.engine_registry


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
                "album": {"id": 987654321},
            }
        ],
        "folder": "Test Artist - Test Album",
        "year": "2023",
        "quality_badge": "HIFI",
        "quality_desc": "44.1kHz / 16bit",
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
        "error": None,
    }
