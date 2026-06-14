# Architecture Audit — Music 4 All

> Auditoría de arquitectura backend/frontend: dependencias entre módulos, acoplamiento/cohesión, cumplimiento de Feature-Sliced Design (FSD), código huérfano, duplicación y riesgos de escalabilidad/crecimiento. Complementa [`docs/architecture.md`](../architecture.md) (descriptivo) con un enfoque de **auditoría** (qué se desvía del diseño objetivo y por qué importa). Ver también [`TECHNICAL_AUDIT.md`](TECHNICAL_AUDIT.md) para deuda técnica general y [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) para implicaciones de seguridad del estado en memoria.

---

# Executive Summary

La arquitectura objetivo (backend modular por dominio con `core/` transversal; frontend FSD con dirección estricta `app/ → widgets/ → features/ → entities/ → shared/`) está **mayormente respetada**, con dos desviaciones concretas:

1. **Violación de dirección de dependencias FSD**: `frontend/src/shared/` importa tipos y lógica de `entities/` en 4 puntos (3 archivos) — `shared/types/api.types.ts`, `shared/ui/QualitySelector/QualitySelector.tsx`, `shared/api/mappers.ts`. La causa raíz es que `shared/api/mappers.ts` y `shared/ui/QualitySelector/` contienen **lógica de dominio** (mapeo de entidades Tidal, selección de calidad de audio) que pertenece a `entities/album` / `entities/download-job` / `features/search`.
2. **Estado en memoria por proceso (`app.state`)** en el backend para registro de control de jobs (`JobControlRegistry`) y estado pendiente de OAuth (`pending_oauth`, `pending_oauth_v2`) — **bloqueante crítico para cualquier despliegue con más de una réplica del backend**.

El resto de la arquitectura es saludable: sin dependencias circulares entre módulos backend, reutilización correcta entre `jobs` (v2) y `download` (legacy) vía `DownloadRepository` compartido, y barrels (`index.ts`) presentes y respetados en todas las slices de `features/*`. El código huérfano (frontend y backend) está acotado y es de bajo riesgo de eliminar.

**Veredicto general**: arquitectura **apta para el estado actual (instancia única, autohospedado)**, pero **no apta para escalado horizontal** sin externalizar el estado en memoria descrito en AR-02.

---

# Estado Actual

| Dimensión | Estado |
|---|---|
| Backend: separación por dominio (`modules/{auth,session,search,metadata,download,jobs,history}`) | ✅ Respetada |
| Backend: capa `core/` transversal | ✅ Presente, pero con un "god dependency" (`core/tidal.py`, 48 imports desde `modules/`) |
| Backend: routers legacy vs v2 coexistiendo | ✅ Según diseño (CLAUDE.md regla 2), reutilización parcial via `DownloadRepository` |
| Backend: dependencias circulares entre módulos | ✅ Ninguna detectada |
| Backend: estado en memoria cross-request | ⚠️ Presente en 2 puntos (`JobControlRegistry`, `pending_oauth*`) |
| Backend: código huérfano (`api/v1/`, `services/`, `schemas/`) | ⚠️ Confirmado sin imports — pendiente validación final (ver TECHNICAL_AUDIT TD-09) |
| Frontend: dirección de dependencias FSD | ⚠️ 4 violaciones `shared/ → entities/` |
| Frontend: barrels `index.ts` en `features/*` | ✅ Presentes y respetados en todas las slices |
| Frontend: código huérfano pre-FSD | ✅ Confirmado sin imports (ver TECHNICAL_AUDIT TD-08) |
| Frontend: `shared/` como "cajón de sastre" de lógica de dominio | ⚠️ Confirmado (`mappers.ts`, `QualitySelector`, `useUrlDetection`, `ws.config.ts`, `api.types.ts`) |

---

# Hallazgos

## AR-01 — Violaciones de dirección de dependencias FSD (`shared/` → `entities/`)

- **Descripción**: 4 puntos de importación en `frontend/src/shared/` importan directamente desde `@/entities/*`, violando la regla de dirección estricta `app/ → widgets/ → features/ → entities/ → shared/` (CLAUDE.md regla 3). `shared/` debe ser la capa más independiente — no puede depender de capas superiores.
- **Evidencia**:
  - `frontend/src/shared/types/api.types.ts:1` — `import type { AudioQuality, AudioMode } from '@/entities/album'`
  - `frontend/src/shared/ui/QualitySelector/QualitySelector.tsx:6` — `import type { AudioQuality } from '@/entities'`
  - `frontend/src/shared/api/mappers.ts:1-3` — importa `Album`, `AudioQuality`, `AudioMode` desde `@/entities/album`, `Track` desde `@/entities/track`, `DownloadProgress` desde `@/entities/download-job`
- **Impacto técnico**: rompe la garantía de que `shared/` puede evolucionar/extraerse independientemente (p. ej. a un paquete compartido) sin arrastrar lógica de dominio. También crea un acoplamiento implícito: cualquier cambio en `entities/album`, `entities/track` o `entities/download-job` puede romper `shared/`, que en teoría debería ser la capa más estable.
- **Impacto de negocio**: bajo a corto plazo (no afecta funcionalidad), pero incrementa el costo de mantenimiento y el riesgo de regresiones en cascada al modificar tipos de entidades — el "blast radius" de un cambio en `entities/album` ahora incluye `shared/`.
- **Recomendación**: mover la lógica de dominio fuera de `shared/`:
  - `shared/api/mappers.ts` (mapeo de respuestas API → entidades `Album`/`Track`/`DownloadProgress`) → mover a `entities/album`, `entities/track`, `entities/download-job` respectivamente (cada entidad mapea su propia forma desde la API).
  - `shared/ui/QualitySelector/` (selector de `AudioQuality`) → mover a `entities/album` (es un control de UI específico del dominio "álbum/calidad de audio"), re-exportado si es necesario desde `features/search` o `features/album-detail`.
  - `shared/types/api.types.ts` → separar los tipos genéricos de API (que sí pertenecen a `shared/types`) de los tipos específicos de dominio (`AudioQuality`/`AudioMode`, que ya existen en `entities/album` y no deberían duplicarse/re-importarse desde `shared`).
- **Esfuerzo estimado**: M (mover 3 archivos + actualizar imports en consumidores — TypeScript/`pnpm build` detectará cualquier import roto).
- **Prioridad**: P2.
- **Severidad**: **High** (violación directa de una regla arquitectónica explícita en CLAUDE.md, aunque sin impacto funcional inmediato).

## AR-02 — Estado en memoria por proceso bloquea escalado horizontal

- **Descripción**: dos estructuras de estado viven en `app.state` (por proceso, no compartidas):
  - `JobControlRegistry._controls: dict[str, JobControl]` (`backend/app/core/job_controls.py:39`, instanciado en `main.py:77`) — registro de `threading.Event` para pausar/cancelar jobs activos.
  - `app.state.pending_oauth = None` y `app.state.pending_oauth_v2 = {}` (`backend/app/main.py:75-76`) — estado del flujo OAuth Device Authorization en curso.
- **Evidencia**: research ARCHITECTURE_AUDIT punto 6; consumido por `backend/app/modules/session/service.py:125-134,151,178` y `backend/app/modules/auth/service.py:31-71`.
- **Impacto técnico**: con **una sola réplica del backend** (configuración actual en `docker-compose.yml`, sin `deploy.replicas`), esto funciona correctamente. Si en el futuro se despliega con `replicas: 2+` o detrás de un balanceador sin sticky sessions: (a) un `PATCH /downloads/{job_id}` (pausa/cancelación) podría llegar a una réplica distinta de la que ejecuta el job → la acción no tendría efecto; (b) el polling de `GET /session/device-auth/{device_code}` podría llegar a una réplica que no inició ese flujo → `pending_oauth_v2` no contendría la entrada → error o estado inconsistente.
- **Impacto de negocio**: bloquea cualquier plan de escalado horizontal del backend sin refactor previo. Para el caso de uso actual (autohospedado, single-user, single-instance) **no es un problema activo**, pero es una restricción arquitectónica importante a documentar antes de que alguien intente `docker compose up --scale backend=2`.
- **Recomendación**: si se planea escalar horizontalmente, externalizar ambos estados a Redis/Valkey (ya usado extensamente para colas/pubsub/sesión): `JobControlRegistry` → claves Redis con pub/sub para señalizar pausa/cancelación entre réplicas; `pending_oauth*` → ya existe el patrón de `music4all:session` en Redis con TTL, aplicar el mismo patrón. **No se recomienda implementar esto de forma especulativa** — solo si el roadmap de producto contempla múltiples réplicas.
- **Esfuerzo estimado**: L (si se decide abordar) — XS (si solo se documenta como restricción conocida, que es la recomendación inmediata).
- **Prioridad**: P3 (no urgente para el caso de uso actual; documentar ahora, implementar solo si cambia el modelo de despliegue).
- **Severidad**: **Critical** *condicionada* — Critical únicamente en el escenario de escalado horizontal; **Informational** en el despliegue actual de instancia única. Se mantiene la clasificación Critical en la tabla de riesgos para visibilidad, con la nota de que es condicional.

## AR-03 — `core/tidal.py` (TidalDownloader) como "god dependency"

- **Descripción**: `backend/app/core/tidal.py` (clase `TidalDownloader`) es importado/usado desde 48 ubicaciones distintas en `backend/app/modules/` — el módulo más dependido por un amplio margen (siguiente: `rate_limiter` con 18).
- **Evidencia**: research ARCHITECTURE_AUDIT punto 5.
- **Impacto técnico**: cualquier cambio en la interfaz pública de `TidalDownloader` (firmas de métodos, atributos de estado como `check_auth()`, `download_single_track`, etc.) tiene un radio de impacto muy amplio. No es necesariamente un problema de diseño — es razonable que el cliente de Tidal sea un servicio central — pero significa que `TidalDownloader` debería tratarse como una **interfaz estable** (cambios con cuidado, idealmente con tests de contrato).
- **Impacto de negocio**: ninguno directo; riesgo de regresión amplificado si se modifica `TidalDownloader` sin cobertura de tests adecuada en los 48 puntos de uso.
- **Recomendación**: no requiere refactor inmediato. Sí se recomienda: (a) asegurar que `TidalDownloader` tenga tests unitarios que cubran su contrato público (`check_auth`, `download_single_track`, métodos de búsqueda/metadata); (b) al modificarlo, ejecutar la suite completa de tests de integración (`tests/integration/`).
- **Esfuerzo estimado**: N/A (es una observación de diseño, no una acción correctiva inmediata).
- **Prioridad**: P3.
- **Severidad**: **Medium** (riesgo de propagación de cambios, no un defecto en sí).

## AR-04 — Módulos `core/` sin consumidores desde `modules/`

- **Descripción**: `core/logging_config.py`, `core/metadata.py` (si existe como módulo separado), `core/metrics.py`, `core/reconciliation.py`, `core/security.py`, `core/worker.py` aparecen con **0 referencias** desde `backend/app/modules/*` en el grep de la auditoría.
- **Evidencia**: research ARCHITECTURE_AUDIT punto 5. **[REQUIERE VALIDACIÓN]**: es esperable que `core/worker.py`, `core/metrics.py`, `core/logging_config.py` y `core/security.py` se usen desde `main.py` (no desde `modules/`) — el grep solo cubrió `modules/`, por lo que esto **no implica que sean código muerto**, solo que su consumo está en la capa de bootstrap (`main.py`) en lugar de en módulos de dominio, lo cual es coherente con su naturaleza transversal.
- **Impacto técnico**: ninguno — es el comportamiento esperado para infraestructura transversal (logging, métricas, seguridad, worker) que se conecta en `main.py`/lifespan, no en routers de dominio.
- **Impacto de negocio**: ninguno.
- **Recomendación**: ninguna acción — se documenta para evitar que una futura auditoría interprete erróneamente "0 referencias desde modules/" como código muerto. Confirmar en `main.py` que estos módulos efectivamente se importan y usan (ya verificado para `metrics.py`, `logging_config.py`, `redis_client` en research de OPERATIONS).
- **Esfuerzo estimado**: N/A.
- **Prioridad**: N/A.
- **Severidad**: **Informational**.

## AR-05 — Duplicación de flujo OAuth legacy/v2 (cross-reference)

- Ver [`TECHNICAL_AUDIT.md` TD-14](TECHNICAL_AUDIT.md#td-14--duplicación-de-estado-oauth-legacyv2-en-memoria) para la descripción completa. Desde la perspectiva arquitectónica, esto es un caso de **cohesión insuficiente**: dos implementaciones paralelas del mismo concepto de dominio (device authorization flow) sin una abstracción compartida (p. ej. un `DeviceAuthFlowService` parametrizable por "shape" de respuesta legacy/v2).
- **Severidad**: **Medium** (duplicado de TD-14, incluido aquí por completitud arquitectónica).

## AR-06 — Código huérfano backend y frontend (cross-reference)

- Ver [`TECHNICAL_AUDIT.md` TD-08](TECHNICAL_AUDIT.md#td-08--código-muerto-frontend-confirmado) y [TD-09](TECHNICAL_AUDIT.md#td-09--código-muerto-backend-apiv1-services-schemas--hallazgo-nuevo). Desde la perspectiva arquitectónica, la existencia de `backend/app/api/v1/`, `backend/app/services/`, `backend/app/schemas/` junto a `backend/app/modules/*` sugiere **restos de una migración arquitectónica anterior** (probablemente la transición hacia la estructura modular por dominio actual). Esto es consistente con el "Plan Maestro de migración por fases" descrito en CLAUDE.md.
- **Severidad**: **Low** (ver TECHNICAL_AUDIT para detalle).

## AR-07 — Reutilización correcta entre `jobs` (v2) y `download` (legacy)

- **Descripción**: `backend/app/modules/jobs/service.py:9-10` importa `DownloadRepository` y `DownloadJobStatus` directamente de `backend/app/modules/download/repository.py` y `download/schemas`. Es la **única** dependencia cross-módulo detectada, es unidireccional (`jobs → download`, sin ciclo de vuelta) y representa **reutilización deliberada** (evita duplicar la capa de persistencia de jobs entre el router legacy `/download` y el v2 `/downloads`).
- **Evidencia**: research ARCHITECTURE_AUDIT punto 7.
- **Impacto técnico**: positivo — reduce duplicación. Único riesgo menor: `jobs` (v2) ahora depende de la estabilidad de `download.repository`/`download.schemas` (legacy); si en el futuro se decide deprecar/eliminar el router legacy `/download`, `DownloadRepository` no puede eliminarse sin antes migrar esta dependencia.
- **Impacto de negocio**: ninguno — patrón saludable.
- **Recomendación**: ninguna acción correctiva. Documentar esta dependencia explícitamente en `docs/architecture.md` para que una futura deprecación del módulo `download` (legacy) tenga en cuenta que `jobs` (v2) depende de su repositorio.
- **Esfuerzo estimado**: N/A.
- **Prioridad**: P3 (solo documentación).
- **Severidad**: **Informational**.

## AR-08 — Barrels (`index.ts`) de `features/*` correctamente respetados

- **Descripción**: todas las slices de `frontend/src/features/*` (`album-detail`, `auth`, `history`, `player`, `search`, `settings`) tienen `index.ts`, y no se detectaron imports cross-slice que bypaseen el barrel (el único import interno encontrado, `LoginForm.tsx` importando `auth.store`/`auth.queries` de su propia slice `auth`, es válido).
- **Evidencia**: research ARCHITECTURE_AUDIT punto 2.
- **Impacto técnico**: positivo — el contrato de "API pública por feature vía `index.ts`" (CLAUDE.md regla 3) se cumple en su totalidad.
- **Severidad**: **Informational** (hallazgo positivo, no requiere acción).

---

# Riesgos

| ID | Riesgo | Severidad | Condición |
|---|---|---|---|
| AR-02 | Estado en memoria (`JobControlRegistry`, `pending_oauth*`) rompe correctitud con >1 réplica backend | Critical (condicional) / Informational (hoy) | Solo si se escala horizontalmente |
| AR-01 | `shared/` depende de `entities/` (4 puntos) — violación FSD | High | Activo |
| AR-05 / TD-14 | Duplicación OAuth legacy/v2 | Medium | Activo |
| AR-03 | `core/tidal.py` como god-dependency (48 usos) | Medium | Activo, mitigable con tests de contrato |
| AR-06 / TD-08/09 | Código huérfano frontend + backend | Low | Activo |
| AR-04 | `core/*` sin uso desde `modules/` (falso positivo esperado) | Informational | N/A |
| AR-07 | `jobs → download` dependencia cross-módulo | Informational | N/A — patrón saludable |
| AR-08 | Barrels FSD respetados | Informational | N/A — hallazgo positivo |

---

# Recomendaciones

1. **AR-01 (FSD)**: planificar una PR de "realineación FSD" que mueva `shared/api/mappers.ts`, `shared/ui/QualitySelector/`, y los tipos de dominio de `shared/types/api.types.ts` a sus capas correctas (`entities/album`, `entities/track`, `entities/download-job`). Esto es puramente mecánico (mover archivos + actualizar imports) y `pnpm build`/`tsc` detectará cualquier import roto — riesgo de regresión bajo si se valida con build.
2. **AR-02 (escalado)**: **no actuar de forma especulativa**. Documentar en `docs/architecture.md` (sección de restricciones) que el backend es **stateful por proceso** y debe ejecutarse como instancia única. Revisar solo si el roadmap de producto contempla multi-réplica.
3. **AR-03 (god dependency)**: asegurar cobertura de tests de `TidalDownloader` antes de cualquier refactor futuro de `core/tidal.py`.
4. **AR-05/AR-06**: ejecutar junto con las fases de limpieza ya descritas en `TECHNICAL_AUDIT.md` (Fase 2 y Fase 6 del roadmap de ese documento).
5. **Mantener** el patrón de barrels FSD (AR-08) y la reutilización `jobs → download` (AR-07) como ejemplos de buena práctica al incorporar nuevos módulos/slices.

---

# Roadmap

| Fase | Alcance | Hallazgos | Esfuerzo |
|---|---|---|---|
| **Fase A — Documentar restricciones de escalado** | Añadir sección a `docs/architecture.md` sobre estado en memoria y requisito de instancia única | AR-02 | XS |
| **Fase B — Realineación FSD `shared/` → `entities/`** | Mover `mappers.ts`, `QualitySelector`, tipos de dominio | AR-01 | M |
| **Fase C — Consolidación OAuth** | Compartido con `TECHNICAL_AUDIT.md` Fase 6 | AR-05/TD-14 | M |
| **Fase D — Limpieza de huérfanos** | Compartido con `TECHNICAL_AUDIT.md` Fase 2 | AR-06/TD-08/TD-09 | S |
| **Fase E — Tests de contrato `TidalDownloader`** | Antes de cualquier refactor de `core/tidal.py` | AR-03 | M |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P1** | — (ningún hallazgo arquitectónico es bloqueante hoy) |
| **P2** | AR-01 |
| **P3** | AR-02 (documentación), AR-03, AR-05, AR-06 |

---

# Próximos Pasos

1. Documentar la restricción de instancia única (AR-02) en `docs/architecture.md` — acción de menor esfuerzo y mayor claridad para futuros despliegues.
2. Planificar la PR de realineación FSD (AR-01) coordinada con cualquier trabajo del rediseño visual (`IMPLEMENTATION_PLAN.md`), ya que ambos tocan `shared/ui/` y `entities/album`.
3. Coordinar la limpieza de código huérfano (AR-06) con `TECHNICAL_AUDIT.md` Fase 2 — una sola PR de "chore" puede cubrir ambos audits.
4. Revisar este documento tras cualquier decisión de producto sobre escalado horizontal (AR-02) o deprecación del router legacy `/download` (AR-07).
