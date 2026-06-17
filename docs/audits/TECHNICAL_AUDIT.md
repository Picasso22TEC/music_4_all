# Technical Audit — Music 4 All

> Auditoría de deuda técnica del estado **real** del repositorio en la fecha de este documento. Basada en lectura directa de código, ejecución de `ruff`/`bandit`, resultados de `pytest` documentados en [`docs/roadmap.md`](../roadmap.md) y hallazgos de los audits hermanos: [`ARCHITECTURE_AUDIT.md`](ARCHITECTURE_AUDIT.md), [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md), [`PERFORMANCE_AUDIT.md`](PERFORMANCE_AUDIT.md), [`UX_AUDIT.md`](UX_AUDIT.md).
>
> **Diferenciación de hallazgos**: cada item se marca como **Confirmado** (verificado leyendo código/ejecutando herramientas), **Suposición** (inferencia razonable sin verificación directa) o **Riesgo potencial** (no se materializó pero podría hacerlo).

---

# Executive Summary

El núcleo funcional de Music 4 All (descarga Tidal → archivo → historial, OAuth Device Flow, búsqueda, colas, WebSocket de progreso) está **operativo y probado en su mayoría** (138/141 tests backend pasan). Sin embargo, existe deuda técnica acumulada en cuatro frentes:

1. **Calidad de código backend**: 104 errores de `ruff` (87 auto-corregibles) y 49 errores de `mypy` no bloquean CI.
2. **Cobertura de pruebas desigual**: backend con suite madura pero 3 tests fallando sin bloquear el pipeline; frontend **sin ningún framework de testing** (Jest/Vitest/Playwright ausentes).
3. **Código muerto significativo**: en frontend (`src/store/useAppStore.ts`, `src/components/`, `src/hooks/`, `src/lib/`, rutas vacías) y en backend (`app/api/v1/`, `app/services/`, `app/schemas/` — hallazgo nuevo, no documentado previamente en `roadmap.md`).
4. **Funcionalidad incompleta expuesta en UI**: `/library`, `/settings` son placeholders, `/downloads` no existe como ruta pero el Sidebar la referencia, `AlbumDetailPanel` no está conectado, `PlayerBar` es decorativo sin `<audio>`.

Ningún hallazgo de este documento es **Critical** desde la perspectiva de "el sistema no funciona" — el flujo principal funciona. La severidad más alta (**High**) corresponde a brechas que **enmascaran regresiones** (CI no bloqueante ante fallos de tests/bandit) y a **código muerto que confunde a nuevos colaboradores** (rutas duplicadas legacy/v2, módulos backend huérfanos).

---

# Estado Actual

| Área | Estado | Fuente |
|---|---|---|
| Backend core (descarga, OAuth, búsqueda, historial, jobs) | ✅ Estable, en uso | `docs/architecture.md`, `docs/roadmap.md` |
| Tests backend | 138/141 pasan (97.9%) | `docs/roadmap.md` §2.3 |
| Lint backend (`ruff check`) | ✅ 0 errores (resuelto TD-01) | `docs/roadmap.md` §2.1 |
| Format backend (`ruff format --check`) | ✅ 0 errores (resuelto TD-01) | `.github/workflows/ci.yml` |
| Type-check backend (`mypy`) | ✅ 0 errores en 69 archivos (resuelto TD-02) | `docs/roadmap.md` §2.2 |
| Bandit (seguridad estática) | 0 hallazgos medium/high al ejecutar localmente; CI con `\|\| true` (no bloqueante) | Research SECURITY_AUDIT |
| Tests frontend | [INEXISTENTE] — sin Jest/Vitest/RTL/Playwright | `docs/roadmap.md` §2.5 |
| Lint/build frontend | `pnpm lint` + `pnpm build` bloqueantes en CI | `.github/workflows/ci.yml` |
| Páginas frontend `/library`, `/settings` | Placeholders (`return null`) | `docs/roadmap.md` §1, research UX |
| Ruta `/downloads` | **No existe** como página, solo como widget `DownloadPanel` | Research UX (Hallazgo nuevo) |
| `AlbumDetailPanel` | No conectado (`handleOpenAlbum` → `console.info`) | `docs/roadmap.md` §1 |
| `PlayerBar` | Decorativo, sin elemento `<audio>` | Research UX (Hallazgo nuevo) |
| Código muerto frontend | ✅ Eliminado (resuelto TD-08) | `docs/roadmap.md` §1, research Architecture |
| Código muerto backend (`app/api/v1/`, `app/services/`, `app/schemas/`) | Confirmado sin referencias (**hallazgo nuevo**) | Research Architecture |
| `prefers-reduced-motion` | [INEXISTENTE] en código, pero asumido como "implementado" en `FRONTEND_VISION.md` §10 | Research UX (Hallazgo nuevo) |

---

# Hallazgos

## TD-01 — Errores de lint (`ruff check`) no resueltos

- **Estado**: ✅ **Resuelto** (`ruff check` y `ruff format --check` pasan con 0 errores; 157 passed, 2 skipped en `pytest tests/ -q`).
- **Descripción (original)**: 104 errores detectados por `ruff check .` en el backend, de los cuales 87 eran auto-corregibles con `ruff check . --fix`. La mayoría eran `F401` (imports sin usar), concentrados en archivos de tests.
- **Resumen de cambios aplicados**:
  - `ruff check . --fix`: 99 errores corregidos automáticamente (imports desordenados, `Union[X, None]` → `X | None`, `collections.abc`, `F401` en test helpers y archivos `api/v1/`).
  - `ruff format .`: 64 archivos reformateados (espaciado, longitud de línea, comillas).
  - Correcciones manuales restantes (12 errores):
    - `core/sanitizer.py`: `raise ValueError(...) from None` (B904).
    - `core/tidal.py`: `raise last_exception from e` (B904).
    - `modules/download/schemas.py`: `DownloadJobStatus(str, Enum)` → `DownloadJobStatus(StrEnum)` (UP042).
    - `schemas/__init__.py` / `services/__init__.py`: imports convertidos a re-exports explícitos (`X as X`) para satisfacer F401 (módulos de compatibilidad legacy).
- **Esfuerzo estimado**: S (1 PR, < 1 día).
- **Prioridad**: P2.
- **Severidad**: **Low**.

## TD-02 — Errores de type-check (`mypy`) fuera de CI

- **Estado**: ✅ **Resuelto** (`mypy app --show-error-codes` reporta 0 errores en 69 archivos; 157 passed, 2 skipped en `pytest tests/ -q`).
- **Descripción (original)**: 55 errores de `mypy` en 11 archivos (cifra revisada al ejecutar contra el estado actual del repositorio; el audit previo estimaba 49). Sin job de `mypy` en CI.
- **Resumen de cambios aplicados por archivo**:
  - **`core/security.py`** (2 errores): cuerpos vacíos con `pass` → `return False` / `return ""` (placeholders válidos).
  - **`services/__init__.py`** (3 errores): re-exports de clases que no existen en los stubs legacy → eliminados; el módulo solo retiene el docstring.
  - **`schemas/__init__.py`** (6 errores): ídem — re-exports eliminados.
  - **`core/tidal.py`** (22 errores): múltiples fixes:
    - `_temp_dir: Path | None` añadido como anotación de clase; `download_folder` usa `assert` para narrowing.
    - `get_session_data`: `expiry_time.isoformat()` guardado contra `None`.
    - `parse_link`: return type declarado como `tuple[str | None, str | None]`; cambiado `int(match.group(1))` → `match.group(1)` (str) para coincidir con stubs de tidalapi.
    - `_probe_quality_from_manifest`: `# type: ignore[arg-type]` en llamada a `session.track(int)` (stubs declaran `str` pero tidalapi acepta int en runtime).
    - `get_metadata`: añadido `return {"error": f"Tipo no soportado: {kind}"}` tras la cadena if/elif para eliminar missing-return; guardas de `None` para `track.album`, `album.artist`, `track.artist`.
    - **Bug real corregido**: `tidalapi.exceptions.UserNotLoggedIn` y `tidalapi.exceptions.ItemNotFound` **no existen** — reemplazados por `AuthenticationError` y `ObjectNotFound` (los except anteriores no capturaban nada, dejando que las excepciones reales se propagaran sin manejo).
    - `download_single_track`: parámetros `progress_callback: Callable | None = None` y `cancel_event: threading.Event | None = None`.
    - Renombrado `meta` (variable `FLAC`) → `track_meta` para eliminar conflicto de tipos con el `meta = FLAC(...)` previo en el mismo scope.
  - **`modules/search/repository.py`** (5 errores): `_map_audio_modes` tipado como `Iterable[object] | None`; `raw` anotado como `Any` para acceso a atributos del resultado de `session.search()`; `# type: ignore[arg-type]` en llamadas a `session.album(int)` y `session.track(int)`.
  - **`modules/metadata/repository.py`** (3 errores): `album.name or ""` y `playlist.name or ""` para `str | None`; renombrado `album` → `track_album` en bucle de tracks para evitar shadowing de la variable del bucle de álbumes.
  - **`modules/download/repository.py`** (5 errores): guardas `artist.name if artist else "Unknown"` y `album.name if album else "Unknown"`; `title = X.name or ""`; `# type: ignore[arg-type]` en llamadas a `session.track/album`.
  - **`modules/jobs/service.py`** (2 errores): `# type: ignore[attr-defined]` movido a la línea de `app_state.redis` (estaba en la línea del dict, no suprimía el error real).
  - **`modules/search/router.py`** (5 errores) + **`modules/jobs/router.py`** (2 errores): **bug real corregido** — `tidal_exc.UserNotLoggedIn` → `tidal_exc.AuthenticationError`; `tidal_exc.ItemNotFound` → `tidal_exc.ObjectNotFound`.
  - **`main.py`** (1 error): `# type: ignore[arg-type]` en `add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)` — slowapi handler compatible en runtime con la firma de Starlette pero no con sus stubs.
- **Bug crítico descubierto durante el fix**: `tidalapi.exceptions` no expone `UserNotLoggedIn` ni `ItemNotFound`. Los nombres correctos son `AuthenticationError` y `ObjectNotFound`. Todos los bloques `except` que usaban las names incorrectas no capturaban nada; las excepciones reales de autenticación y recurso-no-encontrado se propagaban sin manejo como `Exception` genérica.
- **Esfuerzo estimado**: M (los errores de excepciones de tidalapi: S; el resto: 2-3 días repartidos).
- **Prioridad**: P1 (para los errores de excepciones de tidalapi), P2 (para el resto).
- **Severidad**: **Medium**.

## TD-03 — Tests backend fallando sin bloquear CI

- **Estado**: ✅ **Resuelto** (los 3 tests previamente fallidos ahora pasan; 157 passed, 2 skipped en `uv run pytest tests/ -q`).
- **Descripción (original)**: 3 de 141 tests fallaban: `TestDownloadError::test_invalid_track_id` y `TestDownloadError::test_invalid_job_id` (ambos `AttributeError: 'State' object has no attribute 'engine'` — `app.state.engine`/`app.state.redis` no inicializados, ya que el fixture `api_client` crea `TestClient(app)` sin `with`, por lo que el `lifespan` nunca corre) en `tests/integration/test_download_flow.py`; `TestCleanup::test_pubsub_unsubscribed_on_disconnect` en `tests/test_ws_downloads.py` (race condition confirmada, ver `docs/troubleshooting.md` #4.1). El job `test-backend` usa `pytest tests/ -v --tb=short || echo "No tests found — skipping"`, por lo que **estas 3 fallas no rompían el pipeline**.
- **Causa raíz y fix aplicado**:
  1. `test_invalid_track_id` / `test_invalid_job_id`: fixture incompleto (causa raíz simple, no bug de producción). Se añadió el fixture `api_client_with_state` en `tests/conftest.py`, que inicializa `app.state.engine` (mock con `check_auth() -> True`) y `app.state.redis` (mock con `get` async que devuelve `None`) antes de crear el `TestClient`, y restaura el estado previo de `app.state` al finalizar. Los dos tests ahora usan `api_client_with_state` en lugar de `api_client`.
  2. `test_pubsub_unsubscribed_on_disconnect`: **confirmado bug real de producción** (no solo timing de test) — al desconectar el cliente, `TestClient` cancela la cancel scope de la tarea del handler casi simultáneamente con el mensaje `websocket.disconnect`. Si la cancelación llega primero, `await asyncio.gather(relay, return_exceptions=True)` dentro del bloque `finally` de `websocket_downloads` (`app/modules/download/ws.py`) lanza `CancelledError` (no es un `Exception`, así que no es capturable por los `except Exception` existentes) **antes** de llegar a `pubsub.unsubscribe()`/`pubsub.aclose()`/`websocket.close()` — fuga de la suscripción Redis. Fix: el bloque `finally` ahora envuelve la limpieza completa en `anyio.CancelScope(shield=True)`, garantizando que `relay.cancel()`, `pubsub.unsubscribe()`, `pubsub.aclose()` y `websocket.close()` se ejecuten siempre, incluso si la tarea está siendo cancelada. La cancelación pendiente (si la había) se re-lanza recién al salir del scope protegido, preservando el comportamiento original para el resto del flujo.
- **Evidencia**: `docs/roadmap.md` §2.3; `.github/workflows/ci.yml` línea ~121.
- **Impacto técnico**: el patrón `|| echo` sigue siendo excesivamente permisivo — fue diseñado para el caso "no hay tests", pero también enmascara fallos reales. Cualquier regresión futura en `tests/` pasará CI en verde.
- **Impacto de negocio**: riesgo de desplegar regresiones no detectadas; falsa sensación de seguridad en `main`.
- **Pendiente (fuera de alcance de este fix)**: cambiar `|| echo "No tests found — skipping"` por una condición que solo aplique cuando `pytest` reporta "no tests collected" (código de salida 5), y bloquear en cualquier otro fallo — ahora que los 3 tests pasan, este cambio de CI ya no tiene el riesgo de bloquear merges por fallas preexistentes.
- **Esfuerzo estimado**: ~~S (fixture fix: horas) + M (race condition WS: 1-2 días de investigación)~~ — completado.
- **Prioridad**: **P0** para el pendiente de CI (cambio de `|| echo` a gate bloqueante) — sigue siendo la pieza de mayor apalancamiento pendiente.
- **Severidad**: **High** (mientras el pendiente de CI no se resuelva, la suite no bloquea regresiones futuras).

## TD-04 — `security-backend` (Bandit) no bloqueante en CI

- **Descripción**: `uv run bandit -r app/ -ll -f json -o bandit-report.json || true` — el `|| true` garantiza que el job nunca falle, independientemente de los hallazgos. Actualmente Bandit reporta 0 hallazgos medium/high (verificado en esta auditoría), pero el job no protege contra introducir nuevos hallazgos en el futuro.
- **Evidencia**: `.github/workflows/ci.yml` línea ~143; research SECURITY_AUDIT punto 7.
- **Impacto técnico**: ninguno hoy (0 hallazgos); el riesgo es prospectivo.
- **Impacto de negocio**: si se introduce código con un patrón insegFuro (p. ej. `subprocess` con `shell=True`, `eval`, credenciales hardcodeadas), CI no lo detendría.
- **Recomendación**: cambiar `|| true` por un umbral explícito, p. ej. fallar si Bandit reporta severidad `HIGH` (mantener `MEDIUM` como warning no bloqueante durante una fase de transición).
- **Esfuerzo estimado**: S (cambio de una línea + validación).
- **Prioridad**: P1.
- **Severidad**: **Medium**.

## TD-05 — Ausencia total de testing frontend

- **Descripción**: no existe configuración de Jest, Vitest, React Testing Library ni Playwright. La validación del frontend depende exclusivamente de `pnpm lint` + `pnpm build` (type-check) + pruebas manuales en navegador.
- **Evidencia**: `docs/roadmap.md` §2.5; confirmado ausencia en `frontend/package.json` (sin `devDependencies` de testing).
- **Impacto técnico**: cualquier regresión en lógica de componentes (stores de Zustand, hooks de TanStack Query, máquina de estados de `LoginForm`, `useDownloadSocket`) solo se detecta manualmente o en producción.
- **Impacto de negocio**: mayor riesgo de regresiones visibles para el usuario final (UI rota, WebSocket desconectado, flujo OAuth roto) que no se detectan antes de merge.
- **Recomendación**: ver roadmap detallado en [`docs/qa/TEST_PLAN.md`](../qa/TEST_PLAN.md) — introducir Vitest + React Testing Library para unit/integration de stores y componentes críticos (`LoginForm`, `DownloadPanel`, `AlbumCard`), y Playwright para E2E del flujo OAuth + descarga.
- **Esfuerzo estimado**: L (configuración inicial + primeros tests críticos: 1 sprint).
- **Prioridad**: P1.
- **Severidad**: **High**.

## TD-06 — Inconsistencia de imagen Redis/Valkey entre CI y entorno real

- **Descripción**: `docker-compose.yml` usa `valkey/valkey:8-alpine`; `.github/workflows/ci.yml` (`test-backend`) usa `redis:7-alpine`. Compatibles vía protocolo RESP, pero son imágenes distintas en CI vs. desarrollo/producción.
- **Evidencia**: `docs/roadmap.md` §2.4.
- **Impacto técnico**: bajo — ambas implementan RESP y los comandos usados (`SET`/`GET`/`LPUSH`/`BRPOP`/`PUBSUB`) son compatibles. Riesgo de divergencia si se usan comandos/extensiones específicas de Valkey no presentes en Redis 7.
- **Impacto de negocio**: bajo, riesgo de "funciona en CI pero no en producción" o viceversa en un escenario futuro de borde.
- **Recomendación**: unificar usando `valkey/valkey:8-alpine` también en `test-backend` para que CI refleje el entorno real.
- **Esfuerzo estimado**: XS (cambio de una línea en `ci.yml`).
- **Prioridad**: P3.
- **Severidad**: **Low**.

## TD-07 — `SECRET_KEY` declarado pero sin uso (configuración muerta)

- **Descripción**: `.env.example` define `SECRET_KEY=change-me-in-production`, pero **no existe** en `Settings` (`backend/app/config.py`) ni se referencia en ningún módulo de `backend/app/`.
- **Evidencia**: `docs/roadmap.md` §2.7; confirmado por research SECURITY_AUDIT punto 6 (única coincidencia es en paquetes de terceros dentro de `.venv`, no código propio).
- **Impacto técnico**: ninguno (variable no usada).
- **Impacto de negocio**: ninguno hoy, pero genera confusión — un nuevo desarrollador podría asumir que existe un mecanismo de firma/sesión basado en `SECRET_KEY` que no existe.
- **Recomendación**: eliminar `SECRET_KEY` de `.env.example` **o** documentar explícitamente que está reservado para una futura implementación de sesiones firmadas (RM-03, ver `ARCHITECTURE_AUDIT.md`).
- **Esfuerzo estimado**: XS.
- **Prioridad**: P3.
- **Severidad**: **Low**.

## TD-08 — Código muerto frontend confirmado

- **Estado**: ✅ **Resuelto** (todos los archivos eliminados; `pnpm build` pasa sin errores).
- **Descripción (original)**: `frontend/src/store/useAppStore.ts`, `frontend/src/components/` (`DownloadButton.tsx`, `NeonTitle.tsx`, `ProgressBar.tsx`, `VinylCard.tsx`), `frontend/src/hooks/useWebSocket.ts`, `frontend/src/lib/` (`api.ts`, `theme.ts`), y los directorios vacíos `frontend/src/app/dashboard/`, `frontend/src/app/history/`, `frontend/src/app/login/` — todos confirmados **sin ninguna referencia real** (solo aparecen en comentarios que explícitamente los marcan como prohibidos).
- **Archivos eliminados**:
  - `frontend/src/components/DownloadButton.tsx`
  - `frontend/src/components/NeonTitle.tsx`
  - `frontend/src/components/ProgressBar.tsx`
  - `frontend/src/components/VinylCard.tsx`
  - `frontend/src/components/` (directorio — ahora vacío, eliminado)
  - `frontend/src/store/useAppStore.ts`
  - `frontend/src/store/` (directorio — quedó vacío, eliminado)
  - `frontend/src/hooks/useWebSocket.ts`
  - `frontend/src/hooks/` (directorio — quedó vacío, eliminado)
  - `frontend/src/lib/api.ts`
  - `frontend/src/lib/theme.ts`
  - `frontend/src/lib/` (directorio — quedó vacío, eliminado)
  - `frontend/src/app/dashboard/` (directorio vacío)
  - `frontend/src/app/history/` (directorio vacío)
  - `frontend/src/app/login/` (directorio vacío)
- **Verificación pre-eliminación**: grep exhaustivo confirmó 0 imports reales desde ningún archivo activo fuera de `_old/`; las únicas menciones eran en comentarios JSDoc que explícitamente los marcan como prohibidos.
- **Esfuerzo estimado**: S (1 PR, verificar `pnpm build` tras eliminar).
- **Prioridad**: P2.
- **Severidad**: **Low**.

## TD-09 — Código muerto backend (`app/api/v1/`, `app/services/`, `app/schemas/`) — HALLAZGO NUEVO

- **Descripción**: durante esta auditoría se identificaron tres directorios en `backend/app/` (`api/v1/`, `services/`, `schemas/`) que **no son importados desde ningún módulo activo** (`grep` de `from app.api.v1`, `from app.services`, `from app.schemas` no devuelve resultados fuera de sí mismos). No estaban documentados previamente en `docs/roadmap.md`.
- **Evidencia**: research ARCHITECTURE_AUDIT, sección "Bonus". **[REQUIERE VALIDACIÓN]**: confirmar manualmente el contenido y alcance exacto de estos tres directorios antes de eliminarlos (podrían contener fragmentos de una migración anterior, por ejemplo restos de la versión previa a la arquitectura modular `modules/{auth,session,...}`).
- **Impacto técnico**: ninguno en runtime si está confirmado que no se importan. Análogo backend del problema TD-08.
- **Impacto de negocio**: mismo riesgo que TD-08 — confusión para nuevos colaboradores sobre cuál es la API "real" (`modules/*` vs `api/v1/`).
- **Recomendación**: (1) confirmar con `grep -r` exhaustivo que ningún archivo de `backend/app/main.py` ni de `modules/` referencia estos paquetes; (2) si se confirma, eliminar en la misma PR de limpieza que TD-08 o en una separada con el prefijo `chore(backend): remove orphaned api/v1, services, schemas packages`.
- **Esfuerzo estimado**: S.
- **Prioridad**: P2.
- **Severidad**: **Low** (pendiente de validación — podría subir a **Medium** si contiene lógica activa no detectada por el grep).

## TD-10 — Funcionalidad incompleta expuesta en la navegación (`/library`, `/settings`, `/downloads`)

- **Descripción**: `(app)/library/page.tsx` y `(app)/settings/page.tsx` son `return null` (placeholders explícitos "Phase 3+"). Adicionalmente, **no existe ninguna página `/downloads`** bajo `frontend/src/app/(app)/` — solo existe el widget `DownloadPanel` (overlay). Sin embargo, tanto el `Sidebar` (`NAV_ITEMS`) como `AppHeader` (`PAGE_TITLES`) referencian las tres rutas como destinos de navegación.
- **Evidencia**: `docs/roadmap.md` §1; research UX_AUDIT puntos 1 y 8 (hallazgo de `/downloads` es **nuevo**, no documentado en `roadmap.md`).
- **Impacto técnico**: navegar a `/library` o `/settings` renderiza una página vacía (sin error 500, comportamiento "esperado" según `docs/e2e-validation.md` línea 23). Navegar a `/downloads` probablemente produce un 404 de Next.js (ruta no definida) — **[REQUIERE VALIDACIÓN]** runtime para confirmar si existe un `not-found.tsx` que lo capture con gracia.
- **Impacto de negocio**: experiencia de usuario rota — la navegación principal promete 3 de 5 destinos que están vacíos o no existen. Esto es especialmente visible para un usuario nuevo explorando la app.
- **Recomendación**: opciones a corto plazo (sin desarrollo nuevo): (a) ocultar temporalmente los items de navegación de `/library`, `/settings`, `/downloads` del `Sidebar`/`AppHeader` hasta que existan; o (b) crear una página `/downloads` mínima que reutilice `DownloadPanel`/`DownloadJobItem` en modo de página completa (esfuerzo menor que `/library`/`/settings`). Detalle de priorización en [`docs/audits/UX_AUDIT.md`](UX_AUDIT.md).
- **Esfuerzo estimado**: XS (ocultar nav items) / M (página `/downloads` mínima).
- **Prioridad**: P1.
- **Severidad**: **High** (impacto directo en percepción de calidad del producto).

## TD-11 — `AlbumDetailPanel` no conectado

- **Descripción**: `handleOpenAlbum` en `DashboardClient.tsx` solo ejecuta `console.info` — el panel de detalle de álbum (Phase 6C) no está implementado/conectado.
- **Evidencia**: `docs/roadmap.md` §1.
- **Impacto técnico**: el callback `onOpen` de `AlbumCard` no tiene efecto visible para el usuario.
- **Impacto de negocio**: funcionalidad de exploración de álbum (ver tracklist antes de descargar) ausente.
- **Recomendación**: priorizar según roadmap de producto — no es bloqueante para el flujo de descarga actual (búsqueda → descarga directa funciona).
- **Esfuerzo estimado**: M.
- **Prioridad**: P2.
- **Severidad**: **Medium**.

## TD-12 — `PlayerBar` decorativo sin reproducción real — HALLAZGO NUEVO

- **Descripción**: `frontend/src/widgets/player-bar/ui/PlayerBar.tsx` no contiene ningún elemento `<audio>` ni controles de reproducción funcionales. Muestra `currentTrack`, `isPlaying`, `progressSeconds`, `volume` desde `usePlayerStore` como **display puro** (carátula, título, barra de progreso, indicador de volumen), pero no hay forma de iniciar/pausar/buscar reproducción desde la UI.
- **Evidencia**: research UX_AUDIT punto 9. No documentado previamente en `docs/roadmap.md`.
- **Impacto técnico**: el componente renderiza un estado que nunca cambia mediante interacción del usuario — es efectivamente un mock visual.
- **Impacto de negocio**: la barra de reproductor sugiere una capacidad (reproducción de audio) que el producto no ofrece — puede generar confusión o expectativas no cumplidas ("¿por qué no suena nada al hacer click en play?").
- **Recomendación**: decidir explícitamente el alcance: (a) si la reproducción in-app **no** es un objetivo del roadmap, considerar ocultar `PlayerBar` o etiquetarlo claramente como "Próximamente"; (b) si **sí** lo es, documentarlo como una fase nueva del roadmap (fuera del alcance actual de `IMPLEMENTATION_PLAN.md`, que solo cubre la capa visual neón).
- **Esfuerzo estimado**: XS (decisión + posible ocultar) / XL (reproducción real con `<audio>`, gestión de cola, etc. — fuera de alcance de este audit).
- **Prioridad**: P2.
- **Severidad**: **Medium**.

## TD-13 — `prefers-reduced-motion` ausente pese a estar asumido en documentación de diseño

- **Descripción**: `FRONTEND_VISION.md` §10 asume `prefers-reduced-motion` como salvaguarda "ya implementada" para justificar animaciones decorativas (parpadeos neón, escaneo láser). Una búsqueda exhaustiva (`grep -i "prefers-reduced-motion"`) en `frontend/` devuelve **cero coincidencias**.
- **Evidencia**: research UX_AUDIT punto 3; ya señalado como riesgo en `docs/roadmap.md` §4 y en `IMPLEMENTATION_PLAN.md` (Fase 0, bloqueante).
- **Impacto técnico**: ninguna animación actual depende de ello (las animaciones actuales — `animate-pulse-neon`, `animate-shimmer`, `animate-progress-indeterminate` — son continuas pero de baja intensidad). El riesgo es para **trabajo futuro**.
- **Impacto de negocio**: si se implementan las animaciones del rediseño neón (Fase 1+ de `IMPLEMENTATION_PLAN.md`) sin esta salvaguarda, se viola WCAG 2.3.1 (límite de parpadeo) y la preferencia de accesibilidad del sistema operativo del usuario.
- **Recomendación**: ya capturado como Fase 0 (bloqueante) en `IMPLEMENTATION_PLAN.md` — implementar un hook/CSS global `@media (prefers-reduced-motion: reduce)` antes de cualquier nueva animación continua. **No bloquea el estado actual**, pero bloquea la Fase 1 del rediseño.
- **Esfuerzo estimado**: S.
- **Prioridad**: P1 (condicionado al inicio del rediseño visual).
- **Severidad**: **Medium** (alta si se inicia el rediseño sin resolverlo primero).

## TD-14 — Duplicación de estado OAuth legacy/v2 en memoria

- **Descripción**: `app.state.pending_oauth` (legacy, `auth/service.py`) y `app.state.pending_oauth_v2` (v2, `session/service.py`) son dos estructuras de estado en memoria, paralelas, que implementan flujos de device-auth casi idénticos sin abstracción compartida.
- **Evidencia**: research ARCHITECTURE_AUDIT punto 4.
- **Impacto técnico**: cualquier corrección de bug en el flujo OAuth debe aplicarse en dos lugares; alto riesgo de que diverjan con el tiempo (p. ej. el fix de `_ensure_https` solo se aplicó al v2, según el historial de `docs/troubleshooting.md`).
- **Impacto de negocio**: mantenimiento más costoso del flujo de login (uno de los componentes más sensibles del producto).
- **Recomendación**: ver detalle arquitectónico en [`ARCHITECTURE_AUDIT.md`](ARCHITECTURE_AUDIT.md) — extraer una función/servicio compartido para el ciclo de vida del device-auth, parametrizado por el "shape" de respuesta legacy vs v2.
- **Esfuerzo estimado**: M.
- **Prioridad**: P2.
- **Severidad**: **Medium**.

---

# Riesgos

| ID | Riesgo | Severidad | Tipo |
|---|---|---|---|
| TD-03 | CI no bloquea ante fallos reales de pytest (`\|\| echo`) | High | Confirmado |
| TD-05 | Sin testing frontend — regresiones solo detectables manualmente | High | Confirmado |
| TD-10 | Navegación promete `/library`, `/settings`, `/downloads` inexistentes/vacíos | High | Confirmado |
| TD-02 | ~~49 errores mypy, excepciones de tidalapi inexistentes~~ | ~~Medium~~ | ✅ **Resuelto** |
| TD-04 | Bandit no bloqueante (`\|\| true`) | Medium | Confirmado |
| TD-11 | `AlbumDetailPanel` no conectado | Medium | Confirmado |
| TD-12 | `PlayerBar` decorativo, sin reproducción real | Medium | Confirmado (nuevo) |
| TD-13 | `prefers-reduced-motion` ausente, asumido por docs de diseño | Medium | Confirmado |
| TD-14 | Duplicación OAuth legacy/v2 en memoria | Medium | Confirmado |
| TD-01 | ~~104 errores ruff (87 auto-fix)~~ | ~~Low~~ | ✅ **Resuelto** |
| TD-06 | Inconsistencia Redis/Valkey CI vs compose | Low | Confirmado |
| TD-07 | `SECRET_KEY` declarado sin uso | Low | Confirmado |
| TD-08 | ~~Código muerto frontend~~ | ~~Low~~ | ✅ **Resuelto** |
| TD-09 | Código muerto backend (`api/v1`, `services`, `schemas`) | Low (potencial Medium) | Requiere validación |

---

# Recomendaciones

1. **Cerrar el gap de CI no bloqueante primero (TD-03, TD-04)** — es la recomendación de mayor apalancamiento: sin un pipeline que falle ante regresiones reales, cualquier otra mejora de calidad puede erosionarse silenciosamente.
2. **Resolver la navegación rota (TD-10)** antes de invertir en el rediseño visual — no tiene sentido aplicar una nueva capa visual sobre rutas que no existen o están vacías; además es la deuda con mayor impacto de percepción de usuario.
3. **Iniciar testing frontend (TD-05)** en paralelo, comenzando por los componentes críticos identificados en `docs/qa/TEST_PLAN.md` (LoginForm, DownloadPanel, stores Zustand).
4. **Limpieza de código muerto (TD-08, TD-09)** como "quick win" de bajo riesgo — mejora la señal/ruido del repo para todo el equipo.
5. **Errores mypy relacionados con `tidalapi` (subset de TD-02)** — revisar antes que el resto de errores mypy, por su potencial de causar errores 500 reales.

---

# Roadmap

| Fase | Alcance | Hallazgos cubiertos | Esfuerzo |
|---|---|---|---|
| **Fase 1 — Higiene de CI** | Corregir fixture de `test_download_flow.py`, investigar race condition WS, ajustar `|| echo`/`|| true` a umbrales reales | TD-03, TD-04 | S–M |
| **Fase 2 — Limpieza de código muerto** | Eliminar dead code frontend (TD-08) y validar/eliminar backend (TD-09) | TD-08, TD-09 | S |
| **Fase 3 — Navegación y placeholders** | Decisión sobre `/library`, `/settings`, `/downloads`, `PlayerBar` (ocultar vs. implementar mínimo) | TD-10, TD-12 | S–M |
| **Fase 4 — Calidad de tipos** | Resolver errores mypy de `tidalapi` (excepciones/opcionales), luego el resto; introducir `mypy` informativo en CI | TD-02 | M |
| **Fase 5 — Testing frontend** | Configurar Vitest + RTL, primeros tests de stores y `LoginForm`/`DownloadPanel`; Playwright para E2E OAuth/descarga | TD-05 | L |
| **Fase 6 — Consolidación OAuth** | Unificar lógica de device-auth legacy/v2 | TD-14 | M |
| **Fase 7 — Accesibilidad de animaciones** | Implementar `prefers-reduced-motion` global (prerrequisito del rediseño visual, ver `IMPLEMENTATION_PLAN.md` Fase 0) | TD-13 | S |
| **Fase 8 — Lint final** | Resolver remanente de `ruff` (TD-01), unificar Redis/Valkey en CI (TD-06), limpiar `SECRET_KEY` (TD-07) | TD-01, TD-06, TD-07 | S |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P0** | TD-03 |
| **P1** | TD-02 (subset tidalapi), TD-04, TD-05, TD-10, TD-13 |
| **P2** | TD-01, TD-08, TD-09, TD-11, TD-12, TD-14 |
| **P3** | TD-06, TD-07 |

---

# Próximos Pasos

1. Validar el estado actual de `ruff check .` en CI (TD-01) — si ya pasa, actualizar este documento y `docs/roadmap.md`.
2. Corregir el fixture de `tests/integration/test_download_flow.py` (causa raíz simple, alto impacto en confianza de CI).
3. Decidir el tratamiento de `/library`, `/settings`, `/downloads`, `PlayerBar` (TD-10/TD-12) — requiere alineación de producto, no solo ingeniería.
4. Ejecutar `grep -r` exhaustivo de validación para TD-09 antes de cualquier eliminación de `app/api/v1/`, `app/services/`, `app/schemas/`.
5. Referenciar este documento desde [`docs/roadmap.md`](../roadmap.md) como fuente de verdad de deuda técnica ampliada.
