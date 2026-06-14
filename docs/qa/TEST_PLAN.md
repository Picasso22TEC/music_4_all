# Test Plan — Music 4 All

> Plan de pruebas detallado por módulo (backend) y por feature (frontend), pirámide de testing, datos de prueba/fixtures/mocking, ambientes, y plan de adopción de Vitest/Playwright/Contract Testing. Complementa [`QA_STRATEGY.md`](QA_STRATEGY.md) (objetivos/KPIs) y [`E2E_VALIDATION.md`](E2E_VALIDATION.md) (checklist de validación manual/E2E).

---

# Executive Summary

El backend tiene **141 tests** distribuidos en `backend/tests/` (raíz + `integration/` + `validation/`), ejecutados con `pytest` (modo `asyncio_mode = "auto"`), **sin reporte de cobertura configurado** (`pytest-cov` ausente de `pyproject.toml`). La cobertura es fuerte en jobs/worker/WS/sesión (archivos dedicados `test_job_controls.py`, `test_jobs_service.py`, `test_worker_concurrency.py`, `test_ws_downloads.py`, `test_ws_mapper.py`, `test_session_service.py`, `test_startup_reconciliation.py`) pero **no hay archivos de test dedicados visibles para `auth`, `search`, `metadata`, `history`** como módulos aislados — su cobertura, si existe, está dentro de `test_api_endpoints.py` (integración) — **[REQUIERE VALIDACIÓN]**.

El frontend tiene **0% de cobertura automatizada** — este documento define el plan de adopción por fases.

---

# Estado Actual — Inventario de tests backend

| Archivo | Tipo | Módulo(s) cubierto(s) |
|---|---|---|
| `tests/test_main.py` | Unit/Integration | App bootstrap, `/health`, middleware |
| `tests/test_job_controls.py` | Unit | `core/job_controls.py` (`JobControlRegistry`) |
| `tests/test_jobs_service.py` | Unit/Integration | `modules/jobs/service.py` (v2) |
| `tests/test_session_service.py` | Unit | `modules/session/service.py` (incluye `_ensure_https`, 14 tests según `docs/roadmap.md`) |
| `tests/test_startup_reconciliation.py` | Integration | `core/reconciliation.py` (`reconcile_stale_jobs`) |
| `tests/test_worker_concurrency.py` | Integration | `core/worker.py` (semáforo `max_concurrent_downloads`) |
| `tests/test_ws_downloads.py` | Integration | `modules/download/ws.py` (`/ws/downloads`) — **1 test fallando** (TD-03) |
| `tests/test_ws_mapper.py` | Unit | `modules/download/ws_mapper.py` (`flat_to_spec_message`) |
| `tests/integration/test_api_endpoints.py` | Integration | Endpoints HTTP generales — probable cobertura indirecta de `auth`/`search`/`metadata`/`history` |
| `tests/integration/test_download_flow.py` | Integration | Flujo de descarga end-to-end — **2 tests fallando** (TD-03, `KeyError: 'engine'`) |
| `tests/validation/test_flac_validation.py` | Validation | Validación de archivos FLAC resultantes (fidelidad de audio) |
| `tests/load/locustfile.py` | Load | `/health`, `/auth/status`, `/metrics`, `/metadata/search`, `/history`, `/history/stats` (no cubre descargas/WS — ver `PERFORMANCE_AUDIT.md` PERF-05) |

---

# Matriz de Testing por Módulo

## Backend

| Módulo | Tipo de prueba | Herramienta | Cobertura actual | Cobertura deseada | Criticidad |
|---|---|---|---|---|---|
| `modules/auth` (legacy OAuth) | Integration (probable, vía `test_api_endpoints.py`) | pytest | [REQUIERE VALIDACIÓN] | Alta — flujo OAuth legacy aún en uso (CLAUDE.md regla 2) | **Alta** |
| `modules/session` (v2 OAuth) | Unit | pytest (`test_session_service.py`, 14 tests `_ensure_https`) | Buena | Mantener | **Alta** |
| `modules/search` | Integration (probable) | pytest | [REQUIERE VALIDACIÓN] | Media-Alta — incluir casos de `tidalapi` devolviendo `None`/excepciones (relacionado con TD-02 mypy) | **Alta** |
| `modules/metadata` | Integration (probable) | pytest | [REQUIERE VALIDACIÓN] | Media | **Media** |
| `modules/download` (legacy) | Integration | pytest (`test_download_flow.py` — 2/N fallando) | Parcial (fallas TD-03) | Corregir fixture, mantener | **Alta** |
| `modules/jobs` (v2) | Unit + Integration | pytest (`test_jobs_service.py`, `test_worker_concurrency.py`, `test_job_controls.py`) | Buena | Mantener; añadir caso de reutilización `DownloadRepository` (ver `ARCHITECTURE_AUDIT.md` AR-07) | **Alta** |
| `modules/history` | Integration (probable) | pytest | [REQUIERE VALIDACIÓN] | Media — incluir caso de historial vacío (`GET /history/stats` con 0 registros, ya mencionado en `e2e-validation.md`) | **Media** |
| `core/tidal.py` (`TidalDownloader`) | Unit (contrato) | pytest | Indirecta (vía integration) | **Tests de contrato dedicados** — 48 módulos dependen de esta clase (ver `ARCHITECTURE_AUDIT.md` AR-03) | **Crítica** |
| `core/worker.py` | Integration | `test_worker_concurrency.py` | Buena | Añadir caso de re-encode FLAC con `max_concurrent_downloads=1` vs `3` (timing) | **Alta** |
| `core/redis_client.py` | Integration (vía otros tests con Redis de CI) | pytest | Indirecta | Tests dedicados de TTL (`music4all:session`, `music4all:job:{id}` 24h) | **Media** |
| `core/reconciliation.py` | Integration | `test_startup_reconciliation.py` | Buena | Mantener | **Alta** |
| `modules/download/ws.py` (`/ws/downloads`, `/ws/progress/{job_id}`) | Integration | `test_ws_downloads.py` — **1 fallo** (race condition) | Parcial | Resolver TD-03 (race condition); añadir test de cierre 1008 sin sesión | **Crítica** |

## Frontend

| Feature/Slice | Tipo de prueba | Herramienta actual | Herramienta recomendada | Cobertura actual | Cobertura deseada | Criticidad |
|---|---|---|---|---|---|---|
| `features/auth` (`LoginForm`, `auth.store`, `auth.queries`) | — | [INEXISTENTE] | Vitest + RTL | 0% | Alta — máquina de estados OAuth (pending/polling/authorized/expired/error) | **Crítica** |
| `features/search` (`AlbumCard`, `SearchResults`, `EmptyState`) | — | [INEXISTENTE] | Vitest + RTL | 0% | Media-Alta — `resolveQualityBadge()`, estados vacío/error/carga | **Alta** |
| `features/history` | — | [INEXISTENTE] | Vitest + RTL | 0% | Media | **Media** |
| `features/album-detail` | — | [INEXISTENTE] | Vitest + RTL | 0% | Baja hoy (no conectado, ver `UX_AUDIT.md`/TD-11) | **Baja** (hasta que se conecte) |
| `features/player` | — | [INEXISTENTE] | Vitest + RTL | 0% | Baja hoy (`PlayerBar` decorativo, ver TD-12) | **Baja** (hasta decisión de producto) |
| `widgets/download-panel` (`DownloadPanel`, `useDownloadSocket`) | — | [INEXISTENTE] | Vitest + RTL (unit del parsing WS) + Playwright (E2E del flujo completo) | 0% | Alta — WS singleton, contrato de mensajes | **Crítica** |
| `widgets/player-bar` | — | [INEXISTENTE] | Vitest + RTL | 0% | Baja | **Baja** |
| `shared/ui/ProgressBar`, `Button`, `Toast`, `QualitySelector` | — | [INEXISTENTE] | Vitest + RTL (snapshot/props) | 0% | Media — contrato de props usado por 3+ consumidores (ver `DESIGN_SYSTEM_VISION.md`) | **Media** |
| `entities/album`, `entities/track`, `entities/download-job`, `entities/session` | — | [INEXISTENTE] | Vitest (unit de mappers, una vez movidos desde `shared/` per `ARCHITECTURE_AUDIT.md` AR-01) | 0% | Alta — lógica de mapeo API→dominio | **Alta** |
| Stores Zustand (`auth.store`, `downloads.store`, `player.store`, `settings.store`) | — | [INEXISTENTE] | Vitest (unit de reducers/acciones + persistencia) | 0% | Alta — persistencia y rehidratación (`onRehydrateStorage`) son lógica crítica | **Crítica** |
| `middleware.ts` | — | [INEXISTENTE] | Vitest (cuando RM-03 se implemente) | 0% | N/A hoy (scaffolding sin activar) | **N/A** |

---

# Testing Pyramid (objetivo)

```
                    ┌─────────────────┐
                    │   E2E (Playwright) │   3-5 escenarios críticos
                    │   ~5% del esfuerzo  │   (OAuth, búsqueda→descarga, WS)
                    └─────────────────┘
                ┌─────────────────────────┐
                │  Integration (pytest +    │   Backend: ya fuerte
                │  Vitest/RTL para stores)   │   Frontend: stores, hooks WS
                │  ~25% del esfuerzo         │
                └─────────────────────────┘
        ┌─────────────────────────────────────┐
        │   Unit (pytest / Vitest)               │   Servicios, repos, mappers,
        │   ~70% del esfuerzo                    │   reducers Zustand, componentes
        └─────────────────────────────────────┘
```

El backend ya está razonablemente alineado con esta pirámide. El frontend está **invertido** (0 en todos los niveles, validación solo vía type-check + manual) — el plan de adopción (sección siguiente) construye la pirámide desde la base (unit de stores/mappers) hacia arriba.

---

# Datos de prueba, fixtures y mocking

| Aspecto | Backend (actual) | Frontend (recomendado) |
|---|---|---|
| **Fixtures** | `tests/conftest.py`, `tests/fixtures/conftest.py` — [REQUIERE VALIDACIÓN] contenido exacto, pero confirmado su existencia | MSW (Mock Service Worker) para interceptar llamadas API en Vitest/Playwright sin backend real |
| **Mocking de Tidal** | `TidalDownloader`/`tidalapi` se mockean en tests unitarios (inferido por estructura modular); tests de integración usan servicios reales de CI (Postgres/Redis) pero **no** credenciales reales de Tidal | N/A — frontend nunca llama a Tidal directamente |
| **Datos de prueba para audio** | `tests/validation/test_flac_validation.py` — requiere archivos de muestra (formatos FLAC/MP4) — **[REQUIERE VALIDACIÓN]** origen de estos archivos (¿fixtures versionadas o generados?) | N/A |
| **Base de datos de test** | Postgres vía servicio de CI (`postgres:16-alpine` o equivalente en `ci.yml`) | N/A |
| **Redis/Valkey de test** | `redis:7-alpine` en CI (TD-06 — inconsistencia con `valkey:8-alpine` de compose) | N/A |
| **Datos de prueba E2E (Playwright)** | N/A | Necesario: cuenta de prueba de Tidal o mock del flujo Device Auth completo (el flujo real requiere interacción humana en `tidal.com/activate` — Playwright **no puede automatizar la autorización real**; se recomienda mockear la respuesta de `tidalapi` a nivel de backend de test, o usar un backend de test con `app.state.engine` pre-autenticado) |

---

# Ambientes

| Ambiente | Propósito | Configuración |
|---|---|---|
| **Local (dev)** | Desarrollo día a día | `uv run uvicorn --reload` + `pnpm dev`, o `docker compose up` (target `development`) |
| **CI (GitHub Actions)** | Lint, build, tests, bandit, docker build | `ci.yml` — servicios `postgres`/`redis:7-alpine` |
| **CI — propuesto para Playwright** | E2E frontend | Requiere backend de test con Tidal mockeado (ver tabla anterior) — **[PENDIENTE definir]** |
| **Producción / despliegue real** | [NO VERIFICABLE] — sin información de un entorno de producción activo más allá de `docker-compose.yml` | — |

---

# Integración CI/CD

| Job actual (`ci.yml`) | Qué ejecuta | Gate real | Cambio propuesto |
|---|---|---|---|
| `lint-backend` | `ruff check .`, `ruff format --check .` | ✅ Sí | — |
| `build-frontend` | `pnpm install`, `pnpm lint`, `pnpm build` | ✅ Sí | Añadir `pnpm test` (Vitest) cuando exista |
| `test-backend` | `pytest tests/ -v --tb=short \|\| echo ...` | ❌ No (TD-03) | Cambiar a gate real tras corregir los 3 tests fallando |
| `security-backend` | `bandit -r app/ -ll -f json -o ... \|\| true` | ❌ No (TD-04) | Bloquear en severidad High |
| `docker-build` | Build de imágenes backend/frontend | ✅ Sí (si prerequisitos pasan) | — |
| `deploy` | [STUB/INACTIVO] | N/A | Fuera de alcance de este plan |
| **Nuevo: `test-frontend`** | Vitest (unit/integration) | A definir | Crear cuando se adopte Vitest (Fase 2 de adopción) |
| **Nuevo: `e2e`** | Playwright contra `docker compose up` | A definir | Crear cuando se adopte Playwright (Fase 4 de adopción) |

---

# Plan de adopción: Vitest / Playwright / Storybook / Contract Testing

## Vitest + React Testing Library

- **Fase 1 (configuración)**: añadir `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` a `frontend/package.json`; configurar `vitest.config.ts` (alias `@/` igual que `tsconfig.json`).
- **Fase 2 (stores Zustand)**: tests de `auth.store` (transiciones de estado del Device Flow, incluyendo `onRehydrateStorage` con `expiresAt` pasado → `expired`), `downloads.store`, `player.store`, `settings.store`. Estos son los de **mayor ROI** — lógica pura, sin DOM, rápidos de escribir y ejecutar.
- **Fase 3 (mappers de `entities/`)**: una vez aplicado `ARCHITECTURE_AUDIT.md` AR-01 (mover `shared/api/mappers.ts` a `entities/*`), tests unitarios de cada mapper (Album, Track, DownloadProgress) con respuestas API de muestra.
- **Fase 4 (componentes críticos)**: `LoginForm` (todas las transiciones de su máquina de estados, incluyendo error `role="alert"`), `DownloadJobItem`/`DownloadPanel` (renderizado según estado de progreso), `ProgressBar` (variantes y `ANIMATED_GLOWS`).

## Playwright

- **Fase 1 (configuración)**: `playwright.config.ts`, ejecutar contra `docker compose up` (o `pnpm dev` + backend local) en CI.
- **Fase 2 (escenarios)**: priorizar 3-5 escenarios de `E2E_VALIDATION.md`:
  1. Carga de `/dashboard` sin sesión → redirige a `/login`.
  2. Búsqueda en `/dashboard` → resultados → click en descarga → job aparece en `DownloadPanel`.
  3. `/history` con datos → renderiza tabla; `/history` vacío → `HistoryEmptyState`.
  4. Navegación entre `/dashboard`/`/history` → `DownloadPanel`/`PlayerBar` no se remontan (verificación del WS singleton, crítico según CLAUDE.md §8).
  5. (Si se mockea OAuth) Flujo completo Device Auth → `/dashboard`.
- **Bloqueante conocido**: el flujo OAuth real requiere interacción humana en `tidal.com/activate` — Playwright no puede automatizarlo. Se requiere una estrategia de mock a nivel de backend de test (`app.state.engine` pre-autenticado o `tidalapi` mockeado) — **[PENDIENTE definir junto con backend dev]**.

## Contract Testing (mensajes WebSocket)

- **Problema**: `flat_to_spec_message` (`backend/app/modules/download/ws_mapper.py`) define la forma de los mensajes `job_started`/`progress`/`server_ping`/`pong` enviados por `/ws/downloads`; `useDownloadSocket` (frontend) los parsea. No hay garantía automatizada de que ambos lados coincidan.
- **Propuesta de bajo esfuerzo**: extraer un esquema JSON (TypedDict/Pydantic en backend → JSON Schema) de los mensajes WS; en frontend, validar los mensajes recibidos contra ese esquema en un test Vitest usando fixtures de mensajes de ejemplo generados desde `test_ws_mapper.py`.
- **Esfuerzo**: M — requiere coordinación backend/frontend pero el valor es alto dado que es el canal de comunicación en tiempo real más crítico del producto.

## Storybook

- **No se recomienda en esta fase**. Storybook aporta valor para documentación visual de componentes de `shared/ui/`, pero dado que (a) no hay testing frontend aún (prioridad: Vitest/Playwright primero) y (b) `docs/frontend/DESIGN_SYSTEM_VISION.md` ya documenta el sistema de diseño en Markdown, Storybook sería una inversión adicional sin consumidores claros hoy. Revisar **después** de completar Fase 4 de Vitest, si el equipo crece o el catálogo de componentes `shared/ui/` se vuelve difícil de navegar solo con Markdown.

---

# Hallazgos

| ID | Hallazgo | Severidad | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| TP-01 | Sin `pytest-cov` configurado — cobertura backend real desconocida | Medium | Añadir `pytest-cov` + reporte informativo en CI | S | P2 |
| TP-02 | Cobertura de `auth`/`search`/`metadata`/`history` como módulos aislados [REQUIERE VALIDACIÓN] | Medium | Revisar `tests/integration/test_api_endpoints.py` y confirmar qué cubre por módulo; añadir tests unitarios donde falten | M | P2 |
| TP-03 | `core/tidal.py` sin tests de contrato dedicados (48 dependientes) | Medium | Tests de contrato para `TidalDownloader.check_auth`, `download_single_track`, métodos de búsqueda | M | P2 |
| TP-04 | Frontend 0% cobertura — sin red de seguridad para refactors (incl. AR-01 de `ARCHITECTURE_AUDIT.md`) | High | Plan de adopción Vitest (Fases 1-4 arriba) | L | P1 |
| TP-05 | Sin Contract Testing de mensajes WS | Medium | Esquema compartido + fixtures (ver propuesta arriba) | M | P2 |
| TP-06 | E2E OAuth bloqueado por interacción humana real | Medium | Definir estrategia de mock de `tidalapi`/`app.state.engine` para CI | M | P2 |
| TP-07 | Datos de prueba para `test_flac_validation.py` sin origen documentado | Low | Documentar en `TEST_PLAN.md`/README de tests cómo se generan/obtienen los archivos de muestra | XS | P3 |

---

# Riesgos

| ID | Riesgo | Severidad |
|---|---|---|
| TP-04 | Cualquier refactor frontend (incl. AR-01 FSD, rediseño visual) sin red de seguridad automatizada | High |
| TP-02/TP-03 | Puntos ciegos de cobertura backend en módulos de alto riesgo (`auth`, `tidal.py`) | Medium |
| TP-05 | Drift silencioso WS backend/frontend | Medium |
| TP-06 | E2E del flujo más crítico (OAuth) no automatizable sin trabajo adicional | Medium |
| TP-01 | Decisiones de priorización de testing sin datos de cobertura | Medium |

---

# Recomendaciones

1. **TP-04 (adopción Vitest)** es la inversión de mayor impacto — empezar por stores Zustand (Fase 2), que son lógica pura y de alto valor (persistencia, máquina de estados OAuth).
2. **TP-01** (pytest-cov) es trivial y debe hacerse en la misma PR que corrige TD-03 (CI backend).
3. **TP-06** (mock de Tidal para E2E) debe decidirse **antes** de invertir en Playwright (Fase 1 de Playwright) — determina la arquitectura del entorno de CI para E2E.
4. **TP-02/TP-03** son auditorías de cobertura existente — bajo esfuerzo, alto valor informativo, hacer temprano.

---

# Roadmap

| Fase | Alcance | Hallazgos | Esfuerzo |
|---|---|---|---|
| **Fase 1** | `pytest-cov` informativo; auditar cobertura real de `auth`/`search`/`metadata`/`history`/`tidal.py` | TP-01, TP-02, TP-03 | S |
| **Fase 2** | Configurar Vitest + RTL; tests de stores Zustand | TP-04 (parte 1) | M |
| **Fase 3** | Tests de mappers `entities/*` (coordinado con AR-01) y componentes críticos (`LoginForm`, `DownloadPanel`) | TP-04 (parte 2) | M |
| **Fase 4** | Decidir estrategia de mock Tidal; configurar Playwright; 3-5 escenarios E2E | TP-06, TP-04 (parte 3) | L |
| **Fase 5** | Contract testing WS | TP-05 | M |
| **Fase 6** | Documentar datos de prueba FLAC | TP-07 | XS |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P1** | TP-04 |
| **P2** | TP-01, TP-02, TP-03, TP-05, TP-06 |
| **P3** | TP-07 |

---

# Próximos Pasos

1. Ejecutar Fase 1 (cobertura informativa + auditoría de cobertura existente) — desbloquea decisiones informadas para el resto del plan.
2. Iniciar Fase 2 (Vitest + stores) en paralelo con la corrección de TD-03 (no son bloqueantes entre sí).
3. Decidir TP-06 (estrategia de mock Tidal) con backend dev antes de comenzar Fase 4.
4. Coordinar Fase 3 (mappers `entities/*`) con la ejecución de `ARCHITECTURE_AUDIT.md` AR-01 — mismo código, mismo momento.
