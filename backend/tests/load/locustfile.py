"""
Pruebas de carga con Locust para Music 4 All API.

Ejecución:
    cd backend
    uv run locust -f tests/load/locustfile.py --host http://localhost:8000

Luego abrir http://localhost:8089 para la UI de Locust.

Para headless (CI):
    uv run locust -f tests/load/locustfile.py --host http://localhost:8000 \\
        --headless -u 20 -r 5 --run-time 60s
"""
from locust import HttpUser, between, task


class AnonymousUser(HttpUser):
    """Usuario sin autenticar — endpoints públicos."""

    wait_time = between(1, 3)

    @task(5)
    def health(self):
        self.client.get("/health", name="/health")

    @task(3)
    def auth_status(self):
        self.client.get("/auth/status", name="/auth/status")

    @task(1)
    def metrics(self):
        self.client.get("/metrics", name="/metrics")


class AuthenticatedUser(HttpUser):
    """Usuario con sesión activa — simula uso real."""

    wait_time = between(2, 5)

    # En un entorno real, configurar token/sesión en on_start
    def on_start(self):
        pass

    @task(10)
    def search_album(self):
        self.client.get(
            "/metadata/search",
            params={"q": "Pink Floyd", "limit": 10},
            name="/metadata/search",
        )

    @task(5)
    def search_track(self):
        self.client.get(
            "/metadata/search",
            params={"q": "Bohemian Rhapsody", "limit": 5},
            name="/metadata/search",
        )

    @task(3)
    def get_history(self):
        self.client.get("/history", name="/history")

    @task(2)
    def get_history_stats(self):
        self.client.get("/history/stats", name="/history/stats")

    @task(1)
    def auth_status(self):
        self.client.get("/auth/status", name="/auth/status")
