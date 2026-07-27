"""Caché de lecturas del catálogo Tidal + circuit breaker ante 429 (Fase 4).

Las búsquedas y el detalle de álbum/artista son **globales**: el catálogo de
Tidal es el mismo para todos los usuarios, así que se cachean en Redis SIN scope
de usuario. Es la red de seguridad del ``client_id`` compartido: una búsqueda
repetida —del mismo o de otro usuario— no vuelve a golpear a Tidal.

El circuit breaker se abre cuando Tidal responde 429 (``TooManyRequests``):
durante el backoff, las lecturas que no estén en caché devuelven 503 (``TIDAL_BUSY``)
en vez de seguir presionando al ``client_id`` (de terceros y revocable).

Todas las operaciones de Redis son *fail-open*: si Redis falla, se degrada a
llamar a Tidal directamente en vez de romper la petición del usuario.
"""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import TypeVar

import tidalapi.exceptions as tidal_exc
from pydantic import BaseModel
from redis.asyncio import Redis

from app.config import settings
from app.core import metrics
from app.core.exceptions import ApiException
from app.core.logging_config import get_logger

logger = get_logger(__name__)

CACHE_PREFIX = "music4all:cache"
BREAKER_KEY = "music4all:tidal:breaker"

T = TypeVar("T", bound=BaseModel)


# ── Claves ─────────────────────────────────────────────────────────────────────
def _key(kind: str, key_parts: tuple[object, ...]) -> str:
    # El texto de la búsqueda va SIEMPRE al final (puede contener ':'); las partes
    # con cardinalidad fija (limit, id) van antes para que no haya ambigüedad.
    tail = ":".join(str(p) for p in key_parts)
    return f"{CACHE_PREFIX}:{kind}:{tail}"


def normalize_query(query: str) -> str:
    """Normaliza el texto para la clave de caché: minúsculas + espacios colapsados.

    La búsqueda de Tidal es insensible a mayúsculas, así que 'Radiohead' y
    'radiohead   ' comparten entrada y suben la tasa de aciertos.
    """
    return " ".join(query.strip().lower().split())


# ── Circuit breaker ──────────────────────────────────────────────────────────
async def _breaker_open(redis: Redis) -> bool:
    try:
        return bool(await redis.get(BREAKER_KEY))
    except Exception:
        return False  # fail-open: si no podemos leer el estado, no bloqueamos


def _breaker_ttl(retry_after: int) -> int:
    """Cooldown en segundos: usa el Retry-After de Tidal si viene, con tope."""
    ttl = retry_after if retry_after and retry_after > 0 else settings.tidal_breaker_ttl
    return max(1, min(ttl, settings.tidal_breaker_max_ttl))


async def _trip_breaker(redis: Redis, retry_after: int) -> None:
    ttl = _breaker_ttl(retry_after)
    try:
        await redis.setex(BREAKER_KEY, ttl, "1")
        logger.warning("Tidal 429: circuit breaker abierto %ss (backoff del client_id)", ttl)
    except Exception:
        logger.warning("No se pudo abrir el circuit breaker de Tidal en Redis")


def _tidal_busy() -> ApiException:
    return ApiException(
        "TIDAL_BUSY",
        "Tidal está limitando las peticiones ahora mismo. Inténtalo en unos segundos.",
        503,
        retriable=True,
    )


# ── Caché (aside) ──────────────────────────────────────────────────────────────
async def _get_cached(redis: Redis, kind: str, key_parts: tuple[object, ...]) -> dict | None:
    try:
        raw = await redis.get(_key(kind, key_parts))
    except Exception:
        return None  # fail-open: Redis caído → se trata como miss (irá a Tidal)
    if raw is None:
        metrics.tidal_cache_total.labels(kind=kind, result="miss").inc()
        return None
    metrics.tidal_cache_total.labels(kind=kind, result="hit").inc()
    try:
        return json.loads(raw)
    except Exception:
        return None


async def _set_cached(
    redis: Redis, kind: str, key_parts: tuple[object, ...], value: dict, ttl: int
) -> None:
    try:
        await redis.setex(_key(kind, key_parts), ttl, json.dumps(value))
    except Exception:
        logger.warning("No se pudo cachear la lectura de Tidal (%s) en Redis", kind)


# ── Lectura con caché + breaker ─────────────────────────────────────────────────
async def read_through(
    redis: Redis,
    kind: str,
    key_parts: tuple[object, ...],
    ttl: int | None,
    loader: Callable[[], Awaitable[T]],
    parse: Callable[[dict], T],
) -> T:
    """Lee del catálogo con caché-aside + circuit breaker.

    - Si hay entrada en caché (y ``ttl`` no es None), la devuelve (hit, no toca Tidal).
    - Si el breaker está abierto y no hay caché → 503 ``TIDAL_BUSY`` (no golpea a Tidal).
    - Llama a ``loader`` (la llamada real a Tidal). Ante 429 abre el breaker y
      devuelve 503; ante 401 cuenta la métrica y re-lanza (el router la mapea).
    - Cachea el resultado (si ``ttl`` no es None) y lo devuelve.

    ``ttl=None`` desactiva la caché para esa lectura (solo breaker + métrica de
    error), útil para respuestas con union de tipos que no conviene serializar.
    """
    caching = ttl is not None and settings.tidal_cache_enabled

    if caching:
        cached = await _get_cached(redis, kind, key_parts)
        if cached is not None:
            return parse(cached)

    if await _breaker_open(redis):
        raise _tidal_busy()

    try:
        result = await loader()
    except tidal_exc.TooManyRequests as exc:
        metrics.tidal_api_errors_total.labels(kind="rate_limited").inc()
        await _trip_breaker(redis, getattr(exc, "retry_after", -1))
        raise _tidal_busy() from exc
    except tidal_exc.AuthenticationError:
        # Posible expiración de tokens del usuario o revocación del client_id: se
        # cuenta para monitoreo y se re-lanza para que el router la mapee.
        metrics.tidal_api_errors_total.labels(kind="auth").inc()
        raise

    if caching:
        await _set_cached(redis, kind, key_parts, result.model_dump(mode="json"), ttl)
    return result
