"""
Configuración central del rate limiter (slowapi).
Límites por IP usando Redis como backend para consistencia multi-instancia.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
    storage_uri=None,  # se configura en main.py con REDIS_URL
)
