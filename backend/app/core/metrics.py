"""
Métricas Prometheus personalizadas para Music 4 All.
Las métricas HTTP generales (latencia, request count, error rate) son
añadidas automáticamente por prometheus-fastapi-instrumentator en main.py.
"""

from prometheus_client import Counter, Gauge, Histogram

# ── Descargas ─────────────────────────────────────────────────────────────────

downloads_total = Counter(
    "music4all_downloads_total",
    "Número total de tracks descargados",
    ["status"],  # completed | failed
)

downloads_in_progress = Gauge(
    "music4all_downloads_in_progress",
    "Número de descargas en curso en este momento",
)

download_duration_seconds = Histogram(
    "music4all_download_duration_seconds",
    "Tiempo total de descarga de un job (todos los tracks)",
    buckets=[15, 30, 60, 120, 300, 600, 1800, float("inf")],
)

tracks_downloaded_total = Counter(
    "music4all_tracks_downloaded_total",
    "Número total de tracks individuales descargados con éxito",
)

# ── Queue / concurrency ───────────────────────────────────────────────────────

queue_depth = Gauge(
    "music4all_queue_depth",
    "Jobs pendientes en la cola de descargas Redis",
)

downloads_concurrency_limit = Gauge(
    "music4all_downloads_concurrency_limit",
    "Límite máximo de descargas simultáneas (MAX_CONCURRENT_DOWNLOADS)",
)

# ── Auth ──────────────────────────────────────────────────────────────────────

auth_logins_total = Counter(
    "music4all_auth_logins_total",
    "Número de inicios de sesión Tidal completados",
    ["status"],  # success | failure
)
