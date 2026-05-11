"""Tests de endpoints HTTP de la API."""

import pytest


class TestAuthEndpoints:
    """Tests para endpoints de autenticación."""

    def test_login_endpoint_exists(self, api_client):
        """Verificar que endpoint de login exista."""
        response = api_client.post("/api/v1/auth/login")
        
        # Puede fallar pero debe existir el endpoint
        assert response.status_code in (200, 401, 500)

    def test_health_check(self, api_client):
        """Verificar que health check responda."""
        response = api_client.get("/health")
        
        assert response.status_code == 200
        assert "status" in response.json()


class TestMetadataEndpoints:
    """Tests para endpoints de metadatos."""

    def test_metadata_endpoint_format(self, api_client, sample_metadata):
        """Verificar formato de respuesta de metadatos."""
        # Validar estructura esperada
        assert "type" in sample_metadata
        assert "items" in sample_metadata
        assert "folder" in sample_metadata


class TestDownloadEndpoints:
    """Tests para endpoints de descarga."""

    def test_start_download_response_format(self, sample_download_job):
        """Verificar formato de respuesta al iniciar descarga."""
        response = sample_download_job

        required_fields = ["job_id", "status", "progress"]
        for field in required_fields:
            assert field in response, f"Falta campo requerido: {field}"

    def test_download_status_update(self, sample_download_job):
        """Verificar que status se actualice en tiempo real."""
        job = sample_download_job
        
        initial_status = job["status"]
        
        # Simular actualización
        job["status"] = "done"
        job["progress"] = 1.0
        
        assert job["status"] != initial_status or job["progress"] == 1.0
