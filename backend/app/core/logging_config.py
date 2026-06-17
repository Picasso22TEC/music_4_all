"""
Logging estructurado en formato JSON.
Cada evento incluye: timestamp, level, service, message.
El worker añade job_id y otros campos de contexto vía LoggerAdapter.
"""

import logging
import sys

from pythonjsonlogger import jsonlogger

SERVICE_NAME = "music4all-backend"


class _ServiceFilter(logging.Filter):
    """Añade el campo 'service' a todos los registros."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.service = SERVICE_NAME
        return True


def setup_logging(level: str = "INFO") -> None:
    """Configura el handler JSON en el logger raíz."""
    root = logging.getLogger()
    root.setLevel(level)

    # Evitar handlers duplicados si se llama más de una vez
    if root.handlers:
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(_ServiceFilter())

    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(service)s %(name)s %(message)s",
        rename_fields={
            "asctime": "timestamp",
            "levelname": "level",
            "name": "logger",
        },
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
    handler.setFormatter(formatter)
    root.addHandler(handler)

    # Silenciar librerías ruidosas
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def job_logger(name: str, job_id: str) -> logging.LoggerAdapter:
    """Logger con job_id incorporado en cada registro."""
    return logging.LoggerAdapter(logging.getLogger(name), {"job_id": job_id})
