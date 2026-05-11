"""Tests del backend - Punto de entrada para todas las pruebas."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


class TestMainApp:
    """Tests principales de la aplicación."""

    def test_app_startup(self, api_client):
        """Verificar que la app inicie correctamente."""
        response = api_client.get("/health")
        assert response.status_code == 200
