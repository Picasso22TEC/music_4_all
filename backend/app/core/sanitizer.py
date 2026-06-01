"""
Validación y sanitización de URLs de Tidal.
Ninguna URL se procesa sin pasar por estas funciones.
"""
import re
from urllib.parse import urlparse

_ALLOWED_SCHEMES = {"https", "http"}
_ALLOWED_HOSTS = {"tidal.com", "listen.tidal.com", "www.tidal.com"}
_TIDAL_PATH_RE = re.compile(
    r"^/(browse/)?(album|track|playlist)/[\w\-]+", re.IGNORECASE
)


def sanitize_tidal_url(url: str) -> str:
    """
    Valida, normaliza y retorna la URL si es un enlace Tidal legítimo.
    Lanza ValueError con mensaje claro si no lo es.
    """
    url = url.strip()
    if not url:
        raise ValueError("La URL no puede estar vacía")

    try:
        parsed = urlparse(url)
    except Exception:
        raise ValueError("URL malformada")

    if parsed.scheme.lower() not in _ALLOWED_SCHEMES:
        raise ValueError(f"Esquema no permitido: {parsed.scheme!r}. Usar https://")

    host = parsed.netloc.lower().split(":")[0]  # strip port if present
    if host not in _ALLOWED_HOSTS:
        raise ValueError(f"Dominio no permitido: {host!r}. Solo tidal.com")

    if not _TIDAL_PATH_RE.match(parsed.path):
        raise ValueError(
            "La URL debe apuntar a un álbum, track o playlist de Tidal. "
            "Ej: https://tidal.com/browse/album/12345"
        )

    # Reconstruir sin fragmentos ni parámetros extra
    clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    return clean
