"""Cuotas de descarga por usuario (multiusuario público).

Dos límites independientes, ambos en Redis:

- **Concurrentes** (`max_concurrent_jobs_per_user`): jobs del usuario sin estado
  terminal. Acota cuánto puede ocupar un usuario de la cola compartida.
- **Diaria** (`max_downloads_per_day`): jobs creados por el usuario en el día UTC
  en curso. Acota el consumo total; también protege el rate-limit del `client_id`
  compartido de Tidal (ver "Riesgo transversal" del plan).

Cualquiera de los dos límites en 0 o negativo = sin límite (útil en desarrollo).

El conjunto de jobs activos se **autolimpia**: al contarlo se descartan los job_id
cuyo estado ya no existe (expiró su TTL) o ya es terminal. Así un worker que muera
a mitad de un job no deja cupo bloqueado para siempre, y ``release_job`` es una
optimización (libera antes), no un requisito de corrección.

Límite **blando**: verificar y ocupar cupo no es atómico (entre ambos se resuelve
el título contra Tidal), así que varias peticiones simultáneas del mismo usuario
pueden rebasar el tope por unas pocas unidades. Sirve para repartir capacidad y
frenar abuso, **no** como frontera de autorización (eso es `assert_job_owner`).
"""

from __future__ import annotations

from datetime import UTC, datetime

from redis.asyncio import Redis

from app.config import settings
from app.core import abuse
from app.core import redis_client as rc
from app.core.exceptions import ApiException
from app.core.metrics import quota_rejections_total

# Estados de los que un job ya no vuelve por sí solo (no ocupan cupo).
# Se leen igual que en el resto del código: spec_status tiene precedencia.
_TERMINAL_STATUSES = frozenset({"completed", "failed", "error"})

_ACTIVE_KEY = "music4all:user:{uid}:jobs:active"
_DAILY_KEY = "music4all:user:{uid}:quota:{day}"

# El contador diario vive 48 h: cubre el cambio de día UTC sin dejar basura.
_DAILY_TTL = 172_800


def _active_key(uid: str) -> str:
    return _ACTIVE_KEY.format(uid=uid)


def _daily_key(uid: str, day: str | None = None) -> str:
    return _DAILY_KEY.format(uid=uid, day=day or datetime.now(UTC).strftime("%Y-%m-%d"))


def _is_terminal(state: dict) -> bool:
    status = str(state.get("spec_status") or state.get("status") or "")
    return status in _TERMINAL_STATUSES


async def active_jobs(redis: Redis, uid: str) -> set[str]:
    """Jobs del usuario que siguen ocupando cupo, limpiando los que ya no.

    Un job cuenta mientras su estado exista en Redis y no sea terminal.
    """
    key = _active_key(uid)
    members = await redis.smembers(key)
    if not members:
        return set()

    live: set[str] = set()
    stale: list[str] = []
    for job_id in members:
        state = await rc.get_job_state(redis, job_id)
        if state is None or _is_terminal(state):
            stale.append(job_id)
        else:
            live.add(job_id)

    if stale:
        await redis.srem(key, *stale)
    return live


async def daily_count(redis: Redis, uid: str) -> int:
    raw = await redis.get(_daily_key(uid))
    return int(raw) if raw else 0


async def register_job(redis: Redis, uid: str, job_id: str, count_daily: bool = True) -> None:
    """Ocupa un cupo concurrente y, si es un job nuevo, suma uno al contador diario.

    ``count_daily=False`` para reencolados (retry/resume): reintentar el mismo job
    no debe gastar cuota diaria dos veces.
    """
    key = _active_key(uid)
    await redis.sadd(key, job_id)
    # El set no debe sobrevivir a los estados de job que describe (TTL de 24 h).
    await redis.expire(key, rc.JOB_TTL)
    if count_daily:
        day_key = _daily_key(uid)
        await redis.incr(day_key)
        await redis.expire(day_key, _DAILY_TTL)


async def release_job(redis: Redis, uid: str, job_id: str) -> None:
    """Libera el cupo concurrente de un job terminado."""
    await redis.srem(_active_key(uid), job_id)


async def assert_within_quota(redis: Redis, uid: str) -> None:
    """Verifica ambas cuotas antes de aceptar una descarga nueva (429 si se superan).

    Se llama **antes** de resolver el título en Tidal: rechazar pronto ahorra una
    llamada a la API con el client_id compartido.
    """
    max_daily = settings.max_downloads_per_day
    if max_daily > 0:
        used = await daily_count(redis, uid)
        if used >= max_daily:
            quota_rejections_total.labels(quota="daily").inc()
            await abuse.record_strike(redis, uid, kind="quota_daily")
            raise ApiException(
                code="QUOTA_EXCEEDED",
                message=(
                    f"Límite diario alcanzado ({used}/{max_daily} descargas). "
                    "Vuelve a intentarlo mañana."
                ),
                http_status=429,
                retriable=True,
            )

    max_concurrent = settings.max_concurrent_jobs_per_user
    if max_concurrent > 0:
        running = len(await active_jobs(redis, uid))
        if running >= max_concurrent:
            quota_rejections_total.labels(quota="concurrent").inc()
            await abuse.record_strike(redis, uid, kind="quota_concurrent")
            raise ApiException(
                code="QUOTA_EXCEEDED",
                message=(
                    f"Ya tienes {running} descargas en curso (máximo {max_concurrent}). "
                    "Espera a que termine alguna."
                ),
                http_status=429,
                retriable=True,
            )
