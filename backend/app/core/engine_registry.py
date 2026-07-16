"""Registro de motores Tidal por usuario (multiusuario, 1 réplica).

Sustituye al motor único global (`app.state.engine`) por una caché de
`TidalDownloader` **por `tidal_user_id`**. Cada motor se crea de forma perezosa a
partir de los tokens del usuario (cifrados en Redis) y se descarta cuando queda
ocioso, liberando su directorio temporal de descargas.

Diseño (apto para 1 réplica; el estado vive en el proceso):
  - Caché LRU + TTL: se acotan por `max_engines` (evicción del menos usado) y por
    `idle_ttl` (evicción por inactividad). La evicción **nunca** toca motores con
    descargas en curso (refcount > 0).
  - Fijado (pin) por refcount: el worker toma un motor con `acquire()` y lo suelta
    con `release()`; así una descarga larga no puede ser evictada a mitad.
  - Refresco de token: `get_authenticated` re-persiste los tokens cifrados si
    `check_auth` refrescó el access_token (si no, el token nuevo se perdería al
    reiniciar).

Toda la mutación del estado de la caché ocurre en el hilo del event loop y se
protege con un `asyncio.Lock`; las llamadas potencialmente bloqueantes al motor
(`TidalDownloader(...)`, `check_auth`, `_cleanup_temp_dir`) se derivan a un hilo.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field

from app.core import user_session as us
from app.core.logging_config import get_logger
from app.core.tidal import TidalDownloader

logger = get_logger(__name__)


@dataclass
class _Entry:
    engine: TidalDownloader
    last_access: float = field(default_factory=time.monotonic)
    refcount: int = 0

    def touch(self) -> None:
        self.last_access = time.monotonic()


class EngineRegistry:
    """Caché de motores Tidal por usuario con evicción LRU/TTL y limpieza de temp."""

    def __init__(self, max_engines: int = 50, idle_ttl: int = 1800) -> None:
        self.max_engines = max_engines
        self.idle_ttl = idle_ttl
        self._engines: dict[str, _Entry] = {}
        self._lock = asyncio.Lock()

    # ── Creación perezosa ────────────────────────────────────────────────────
    async def _create_engine(self, redis, uid: str) -> TidalDownloader | None:
        tokens = await us.get_user_tokens(redis, uid, "oauth")
        if not tokens:
            return None
        # Construcción del motor: crea un temp dir y detecta ffmpeg (E/S local) →
        # a un hilo para no bloquear el event loop.
        return await asyncio.to_thread(
            TidalDownloader,
            log_callback=lambda msg, _uid=uid: logger.debug("engine[%s]: %s", _uid, msg),
            session_data=tokens,
        )

    async def get(self, redis, uid: str) -> TidalDownloader | None:
        """Devuelve el motor del usuario (creándolo si hace falta), o None sin tokens."""
        async with self._lock:
            entry = self._engines.get(uid)
            if entry is not None:
                entry.touch()
                return entry.engine

        engine = await self._create_engine(redis, uid)
        if engine is None:
            return None

        async with self._lock:
            # Otra corrutina pudo crearlo mientras liberábamos el lock: descartar
            # el nuestro (y su temp dir) y devolver el ya cacheado.
            existing = self._engines.get(uid)
            if existing is not None:
                await asyncio.to_thread(engine._cleanup_temp_dir)
                existing.touch()
                return existing.engine
            self._engines[uid] = _Entry(engine)
            await self._evict_locked()
            return engine

    async def get_authenticated(self, redis, uid: str) -> TidalDownloader | None:
        """Motor del usuario verificando/refrescando la sesión Tidal.

        Devuelve None si no hay tokens o la sesión no puede autenticarse. Si
        `check_auth` refresca el access_token, re-persiste los tokens cifrados.
        """
        engine = await self.get(redis, uid)
        if engine is None:
            return None

        token_before = getattr(engine.session, "access_token", None)
        ok = await asyncio.to_thread(engine.check_auth)
        if not ok:
            return None
        token_after = getattr(engine.session, "access_token", None)
        if token_after and token_after != token_before:
            token_data = us.token_data_from_session(engine.session)
            await us.store_user_tokens(redis, uid, "oauth", token_data)
        return engine

    # ── Fijado (worker) ──────────────────────────────────────────────────────
    async def acquire(self, redis, uid: str) -> TidalDownloader | None:
        """Toma el motor autenticado del usuario y lo fija (no evictable) hasta release()."""
        engine = await self.get_authenticated(redis, uid)
        if engine is None:
            return None
        async with self._lock:
            entry = self._engines.get(uid)
            if entry is None:
                # Evictado en una carrera: re-registrar el motor que tenemos en mano.
                entry = _Entry(engine)
                self._engines[uid] = entry
            entry.refcount += 1
            entry.touch()
        return engine

    async def release(self, uid: str) -> None:
        async with self._lock:
            entry = self._engines.get(uid)
            if entry is not None and entry.refcount > 0:
                entry.refcount -= 1
                entry.touch()

    # ── Evicción ─────────────────────────────────────────────────────────────
    async def _evict_locked(self) -> None:
        """Evicta motores ociosos (TTL) y aplica el tope LRU. Requiere el lock tomado."""
        now = time.monotonic()
        # 1) TTL: fuera los ociosos sin descargas en curso.
        stale = [
            uid
            for uid, e in self._engines.items()
            if e.refcount == 0 and now - e.last_access > self.idle_ttl
        ]
        for uid in stale:
            await self._remove_locked(uid)

        # 2) LRU: si excede el tope, evicta el menos-recientemente-usado (refcount 0).
        while len(self._engines) > self.max_engines:
            candidates = [(uid, e) for uid, e in self._engines.items() if e.refcount == 0]
            if not candidates:
                break  # todos en uso: no forzar
            lru_uid = min(candidates, key=lambda kv: kv[1].last_access)[0]
            await self._remove_locked(lru_uid)

    async def _remove_locked(self, uid: str) -> None:
        entry = self._engines.pop(uid, None)
        if entry is not None:
            await asyncio.to_thread(entry.engine._cleanup_temp_dir)
            logger.debug("engine[%s] evicted", uid)

    # ── Invalidación / apagado ───────────────────────────────────────────────
    async def invalidate(self, uid: str) -> None:
        """Descarta el motor de un usuario (p.ej. logout total / tokens revocados)."""
        async with self._lock:
            await self._remove_locked(uid)

    async def cleanup_all(self) -> None:
        """Limpia todos los motores y sus directorios temporales (shutdown)."""
        async with self._lock:
            for uid in list(self._engines.keys()):
                await self._remove_locked(uid)

    def size(self) -> int:
        return len(self._engines)
