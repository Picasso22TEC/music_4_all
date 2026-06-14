# E2E Validation — Checklist Empresarial (Music 4 All)

> Checklist de validación end-to-end orientado a **release readiness** y **regresión**, organizado por escenario de negocio (no por componente técnico, a diferencia de [`../e2e-validation.md`](../e2e-validation.md), que sigue siendo la checklist técnica de referencia para `docker compose up`). Cada escenario incluye casos felices, de error y límite, y se marca qué casos son candidatos a automatización con Playwright (ver [`TEST_PLAN.md`](TEST_PLAN.md) — Fase 4). Complementa [`QA_STRATEGY.md`](QA_STRATEGY.md) y [`QUALITY_GATES.md`](QUALITY_GATES.md).

---

# Executive Summary

Music 4 All cuenta con una checklist técnica de validación (`docs/e2e-validation.md`, 98 ítems) centrada en verificar que cada componente arranca y responde correctamente. Este documento la complementa con una vista **orientada a flujos de negocio end-to-end** (lo que un usuario real experimenta), clasificando cada escenario en casos felices/error/límite y diferenciando **Smoke Tests** (subconjunto mínimo post-despliegue) de **Regression Tests** (suite completa antes de release). Todos los casos aquí descritos son **actualmente manuales** — `[NO IMPLEMENTADO]` como automatización, salvo lo indicado en la sección de Playwright, que es un plan, no un estado actual.

Dos hallazgos transversales condicionan toda la ejecución de esta checklist:
1. **UX-01** (`UX_AUDIT.md`): la ruta `/downloads` no existe en el frontend — cualquier caso que mencione "vista de descargas" debe validarse contra el widget `DownloadPanel`, no una página dedicada.
2. **TP-06** (`TEST_PLAN.md`): el flujo OAuth Device real requiere interacción humana en `tidal.com/activate`, lo que limita la automatización end-to-end de los escenarios 1 y 9.

---

# Estado Actual

| Escenario | Documentado en | Automatizado | Estado |
|---|---|---|---|
| 1. OAuth Device Flow | `docs/e2e-validation.md` §3-4 | No | Manual, ejecutado según `docs/e2e-validation.md` |
| 2. Búsqueda | `docs/e2e-validation.md` §6 (parcial) | No | Manual |
| 3. Descarga Track/Álbum/ZIP | `docs/e2e-validation.md` §6 | No | Manual |
| 4. Historial | `docs/e2e-validation.md` §7 | No | Manual |
| 5. WebSocket (progreso) | `docs/e2e-validation.md` §5 | No | Manual; 1 caso con fallo conocido (TD-03) |
| 6. Cancelación | `docs/e2e-validation.md` §6 (parcial) | No | Manual |
| 7. Reintento | `docs/e2e-validation.md` §6 (parcial) | No | Manual |
| 8. Reconexión (WS/red) | [NO EXISTE checklist previa] | No | **Nuevo en este documento** |
| 9. Expiración de token | `docs/e2e-validation.md` §3 (parcial) | No | Manual |

---

# Checklist por Escenario

## 1. OAuth Device Flow

**Casos felices**
- [ ] Usuario sin sesión abre `/login`, hace click en "Connect with Tidal", recibe `user_code` + `verification_uri_complete` (URL absoluta `https://...`).
- [ ] Usuario autoriza en otro dispositivo → polling detecta `status: "authorized"` → redirección automática a `/dashboard`.
- [ ] Sesión persiste tras recargar página (`auth.store` rehidratado desde `localStorage`).

**Casos de error**
- [ ] Usuario deniega la autorización en Tidal → `GET /session/device-auth/{device_code}` devuelve estado de denegación → frontend limpia `deviceAuth`, muestra error `role="alert"`, permite reintentar.
- [ ] `device_code` expira sin autorización (esperar `expires_in`) → 400 `DEVICE_AUTH_EXPIRED` → mismo manejo de error que el caso anterior.
- [ ] Backend no disponible al hacer `POST /session/device-auth` → frontend muestra error de red, no queda en estado de carga infinito.

**Casos límite**
- [ ] Tidal no devuelve `verification_uri_complete` (solo `verification_uri` + `user_code`) → fallback `verification_uri + "/" + user_code` produce URL válida (ver `docs/troubleshooting.md` #3).
- [ ] El intervalo de polling del frontend respeta el `interval` devuelto por el backend (no hardcodeado).
- [ ] Doble click rápido en "Connect with Tidal" no dispara dos `POST /session/device-auth` concurrentes con estados `deviceAuth` en conflicto.

---

## 2. Búsqueda

**Casos felices**
- [ ] Buscar un término ≥ 2 caracteres en `/dashboard` devuelve resultados de `GET /search` con carátulas cargando correctamente (`resources.tidal.com`).
- [ ] Pegar una URL de álbum/track de Tidal activa `GET /resolve` y muestra el recurso resuelto.
- [ ] Resultados muestran grid responsivo (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`).

**Casos de error**
- [ ] Búsqueda sin sesión activa (`engine.check_auth()` falla) → backend devuelve error de autenticación → frontend muestra estado de error (`EmptyState` variante `error`), no un grid vacío silencioso.
- [ ] `GET /search` con backend caído → frontend muestra error de red, no un loading infinito.
- [ ] URL pegada inválida/no soportada por `GET /resolve` → mensaje de error claro, no crash de la UI.

**Casos límite**
- [ ] Búsqueda con 1 carácter → no dispara request (validación cliente) o backend la rechaza sin error 500.
- [ ] Búsqueda sin resultados → `EmptyState` variante `no-results`, no un grid vacío sin mensaje.
- [ ] Búsqueda con caracteres especiales/Unicode (acentos, emojis) no rompe el request ni el renderizado.
- [ ] Rate limit de `/search/*` (30/min ×3 endpoints, ver `SECURITY_AUDIT.md`) — exceder el límite devuelve 429 manejado con mensaje legible (no error genérico).

---

## 3. Descarga: Track / Álbum (ZIP)

> Confirmado en código (`backend/app/core/worker.py:215-228`): si el job tiene **1 track**, el resultado final es el archivo de audio (FLAC/MP4); si tiene **>1 track** (álbum), el worker empaqueta la carpeta con `engine.pack_folder_to_zip` y el `file_path` final es un `.zip`.

**Casos felices — Track único**
- [ ] Seleccionar calidad (`MASTER`/`HIRES`/`HIGH`/`NORMAL`) vía `QualitySelector` y lanzar descarga de un track individual llama a `POST /downloads` con `{track_id, quality}`.
- [ ] Job aparece en `DownloadPanel` con `status: "queued"` → `"downloading"` → `"completed"`, `total_tracks = 1`.
- [ ] Al completarse, `GET /download/file/{job_id}` (legacy) descarga el archivo de audio individual (no un `.zip`).
- [ ] El archivo descargado es un FLAC válido (ver `tests/validation/test_flac_validation.py`) con metadatos correctos (título, artista, carátula embebida — `[REQUIERE VALIDACIÓN]` si la carátula se embebe).

**Casos felices — Álbum (ZIP)**
- [ ] Lanzar descarga de un álbum (`{album_id, quality}`) crea un job con `total_tracks = N > 1`.
- [ ] El progreso (`progress_percent`, `current_track_filename`, `completed_tracks`/`total_tracks`) se actualiza por `/ws/downloads` track por track.
- [ ] Al completarse todos los tracks, el worker genera `{folder}.zip` (`pack_folder_to_zip`) y `file_path` apunta al `.zip`.
- [ ] `GET /download/file/{job_id}` descarga el `.zip` y contiene los `N` tracks esperados.

**Casos de error**
- [ ] Un track individual falla durante la descarga del álbum (`path_or_err` indica error, `worker.py:198`) → el job continúa con los tracks restantes (no aborta todo el álbum) y queda registrado en logs (`log.warning`).
- [ ] Si **todos** los tracks fallan (`done != total` al final) → el job se marca como fallido (`downloads_total.labels(status="failed")`), no como `completed` con un ZIP vacío/corrupto.
- [ ] Descarga de un recurso no disponible en la cuenta/región de Tidal del usuario → error claro al usuario, job marcado `failed`, no quedando en `downloading` indefinidamente.
- [ ] `POST /downloads` sin sesión válida → rechazado (mismo criterio que búsqueda).

**Casos límite**
- [ ] Álbum con exactamente 1 track → se trata como track único (`total > 1` es `false`), **no** se genera `.zip` — verificar que esta rama (`total == 1` para un recurso tipo "álbum") no produce un `.zip` de un solo archivo innecesariamente.
- [ ] Lanzar más de `max_concurrent_downloads` (3) jobs simultáneos → excedentes quedan `queued` hasta liberar un slot (`asyncio.Semaphore`).
- [ ] Calidad `HI_RES_LOSSLESS` (MP4→FLAC vía `_extract_flac_from_mp4`, stream-copy) vs `LOSSLESS` (`_finalize_raw_to_flac`, re-encode `-compression_level 5`) — verificar que ambos producen archivos válidos y que el de re-encode no se cuelga con tracks largos (riesgo `PERFORMANCE_AUDIT.md` PERF-03).
- [ ] Nombre de archivo/carpeta con caracteres especiales (título de álbum con `/`, `:`, emojis) no rompe `pack_folder_to_zip` ni la ruta del archivo final.

---

## 4. Historial

**Casos felices**
- [ ] Tras completar una descarga (track o álbum), aparece un registro nuevo en `GET /history` (title, artist, quality, cover_url, job_id, downloaded_at).
- [ ] `/history` (frontend) muestra la lista ordenada por fecha descendente, con `role="status" aria-live="polite"` durante carga.
- [ ] `GET /history/stats` devuelve estadísticas agregadas correctas con historial poblado.
- [ ] Los registros persisten tras reiniciar el contenedor `backend` (Postgres, no memoria).

**Casos de error**
- [ ] `GET /history` con backend/Postgres caído → frontend muestra `role="alert"`, no un listado vacío engañoso.
- [ ] `GET /history/stats` con historial vacío no lanza error (verificación explícita ya presente en `docs/e2e-validation.md` §7).

**Casos límite**
- [ ] Historial vacío (instalación nueva) → `HistoryEmptyState` ("No downloads yet"), no tabla vacía sin mensaje.
- [ ] Historial con >200 entradas — verificar que `music4all:downloads:history` (lista Redis, `LTRIM` a 200) no causa discrepancia entre lo que ve el frontend (que lee de Postgres vía `GET /history`, sin límite aparente) y la caché de Redis — **[REQUIERE VALIDACIÓN]** si `GET /history` pagina o devuelve todo.

---

## 5. WebSocket (`/ws/downloads`)

**Casos felices**
- [ ] Conexión con sesión válida permanece abierta; `{"type": "ping"}` → `{"type": "pong", "timestamp": <epoch ms>}`.
- [ ] Heartbeat: tras ~35s sin actividad del cliente, el servidor envía `{"type": "server_ping"}`.
- [ ] Mensajes `job_started` y `progress` llegan correctamente formateados (`flat_to_spec_message`, ver `tests/test_ws_mapper.py`).
- [ ] `/ws/progress/{job_id}` (legacy, sin auth) sigue funcionando para un `job_id` válido.

**Casos de error**
- [ ] Conexión sin sesión válida → servidor acepta y cierra inmediatamente con código **1008** (Policy Violation) — verificado en `tests/test_ws_downloads.py`, pero con **1 test fallando** (TD-03/E2E-05, race condition de limpieza de suscripción).
- [ ] Cierre abrupto del cliente (cerrar pestaña) → no deja suscripciones huérfanas en `music4all:progress:all` (validar manualmente con `valkey-cli PUBSUB CHANNELS`, ya que el test automatizado falla — ver `docs/e2e-validation.md` §5).

**Casos límite**
- [ ] Múltiples pestañas/conexiones simultáneas al mismo `/ws/downloads` — cada una abre su propio `redis.pubsub()` (`download/ws.py:105-106`); verificar que N conexiones no degradan el broadcast de progreso (riesgo `PERFORMANCE_AUDIT.md` PERF-02, sin límite de conexiones).
- [ ] Navegación entre `/dashboard` y `/history` con `DownloadPanel` montado — **no debe** remontar `useDownloadSocket()` (regla crítica CLAUDE.md §8, WebSocket Singleton).

---

## 6. Cancelación

**Casos felices**
- [ ] `DELETE /downloads/{job_id}` sobre un job en `downloading` o `queued` lo cancela; `DownloadPanel` refleja `status: "cancelled"` vía WS.
- [ ] El estado y evento WS de cancelación los publica el handler HTTP (no el worker) — confirmado en `worker.py:209-213` (`# State and WS event already published by the HTTP cancel handler`).

**Casos de error**
- [ ] `DELETE /downloads/{job_id}` sobre un `job_id` inexistente o ya `completed`/`failed` → error claro (404 o 409), sin crash del worker.

**Casos límite**
- [ ] Cancelar un job justo en el instante en que el último track termina (race entre `cancel_event` y `done == total`) — verificar que no queda en estado ambiguo (ni `completed` ni `cancelled`).
- [ ] Cancelar un job de álbum a mitad de descarga — verificar que **no** se genera un `.zip` parcial/corrupto en `download_folder`.

---

## 7. Reintento

**Casos felices**
- [ ] `PATCH /downloads/{job_id} {"action":"retry"}` sobre un job `failed` lo vuelve a encolar (`queued`) y procesa de nuevo.
- [ ] El reintento respeta `max_concurrent_downloads` (no se ejecuta inmediatamente si ya hay 3 jobs activos).

**Casos de error**
- [ ] Reintentar un job `completed` o `cancelled` → rechazado con error claro (acción no válida para ese estado).
- [ ] Reintentar un job cuyo recurso ya no existe en Tidal (eliminado/región) → falla de nuevo de forma controlada (no loop infinito de reintentos automáticos — confirmar que el reintento es **manual**, no automático).

**Casos límite**
- [ ] Reintentar un job de álbum que falló a mitad (algunos tracks ya descargados) — verificar si el reintento re-descarga todo o solo los tracks faltantes — **[REQUIERE VALIDACIÓN]**, no documentado en el código revisado.

---

## 8. Reconexión (WS / red)

> Escenario nuevo, no presente en `docs/e2e-validation.md`. Cubre la resiliencia del cliente frente a pérdidas de conectividad temporales.

**Casos felices**
- [ ] Si la conexión `/ws/downloads` se pierde (red inestable, backend reinicia) y se restablece, el frontend reconecta automáticamente y vuelve a recibir `progress` sin requerir recarga manual de página — **[REQUIERE VALIDACIÓN]**: confirmar si `useDownloadSocket` implementa reconexión automática con backoff.
- [ ] Tras reconectar, el estado de los jobs en curso se resincroniza correctamente (no quedan jobs "congelados" en el último `progress_percent` recibido antes del corte).

**Casos de error**
- [ ] Backend reinicia mientras hay jobs `downloading` → al volver, `reconcile_stale_jobs` los marca como fallidos (`docs/e2e-validation.md` §6, último ítem) — el frontend debe reflejar este cambio de estado tras reconectar, no mostrar el job "congelado" en `downloading`.
- [ ] Pérdida de conexión a Redis/Valkey durante una descarga activa — **[NO VERIFICABLE]** sin entorno de pruebas; documentar comportamiento esperado vs observado.

**Casos límite**
- [ ] Reconexión repetida en bucle corto (red intermitente) no genera fugas de suscripciones Redis acumuladas (relacionado con caso de Escenario 5).

---

## 9. Expiración de token

**Casos felices**
- [ ] Sesión activa, `expires_at` aún no alcanzado → `GET /session/status` devuelve `status: "active"` con datos de usuario.

**Casos de error**
- [ ] Token expira mientras el usuario tiene la app abierta → siguiente request (`/session/status`, `/search`, `/downloads`) detecta expiración → `auth.store.status` pasa a `expired`/`unauthenticated` → redirección a `/login` con mensaje claro (no un error genérico de red).
- [ ] Al rehidratar `auth.store` desde `localStorage`, si `expiresAt` ya pasó, `status` se marca `expired` automáticamente (`onRehydrateStorage`) — confirmado en `docs/e2e-validation.md` §3.

**Casos límite**
- [ ] Token expira **durante** una descarga activa — verificar si el job en curso continúa hasta completar (el worker usa la sesión del servidor vía `engine`, no la del navegador) o si se interrumpe — relacionado con `SECURITY_AUDIT.md` SEC-01 (autenticación a nivel de servidor, no por usuario).
- [ ] Renovación de token (si `tidalapi` soporta refresh) ocurre de forma transparente sin interrumpir WS activo — **[REQUIERE VALIDACIÓN]**.

---

# Smoke Tests (post-despliegue, <10 min)

Subconjunto mínimo a ejecutar tras cada `docker compose up --build` o despliegue, antes de cualquier prueba más profunda:

1. [ ] `GET /health` → 200, `{"status": "healthy"}`.
2. [ ] `/login` carga y muestra "Connect with Tidal".
3. [ ] OAuth Device Flow completo (Escenario 1, casos felices) — login funcional end-to-end.
4. [ ] Búsqueda básica (Escenario 2, caso feliz 1) devuelve resultados con carátulas.
5. [ ] Descarga de 1 track completa exitosamente y es descargable (Escenario 3, track único).
6. [ ] `/ws/downloads` recibe `progress` durante la descarga anterior (Escenario 5, caso feliz 3).
7. [ ] El registro aparece en `/history` tras completar (Escenario 4, caso feliz 1).
8. [ ] Prometheus (`:9090`) tiene el target `backend:8000/metrics` `UP`.

---

# Regression Tests (pre-release, suite completa)

Ejecutar **todos** los casos de las secciones 1-9 de este documento, más la checklist técnica completa de `docs/e2e-validation.md` (98 ítems). Adicionalmente:

- [ ] Repetir el smoke test con **calidad `HI_RES_LOSSLESS`** y con **`NORMAL`** (rutas de código distintas en `core/tidal.py`: stream-copy vs re-encode).
- [ ] Repetir Escenario 3 con un álbum de **1 track** y uno de **>1 track** (verificar bifurcación ZIP vs archivo único).
- [ ] Ejecutar Escenario 6 (Cancelación) durante un job de álbum a distintos porcentajes de avance (10%, 50%, 90%).
- [ ] Verificar los 3 tests backend actualmente fallando (TD-03, `TEST_PLAN.md`) — si siguen fallando, **bloquear release** según `QUALITY_GATES.md`.

---

# Casos automatizables con Playwright (plan, no estado actual)

Según `TEST_PLAN.md` (Fase 4), los siguientes casos son los candidatos de mayor ROI para automatizar primero, una vez resuelto **TP-06** (mock de `tidalapi`/sesión pre-autenticada):

| Caso | Escenario | Complejidad |
|---|---|---|
| Sin sesión → `/login`; con sesión mockeada → `/dashboard` | 1, 9 | Media (depende de TP-06) |
| Búsqueda → resultados visibles con carátulas | 2 | Baja |
| Búsqueda → lanzar descarga de 1 track → `DownloadPanel` muestra progreso → completado | 3, 5 | Media |
| Navegación `/dashboard` ↔ `/history` sin remount de `DownloadPanel`/WS | 5 (WS singleton) | Baja-Media |
| `/history` vacío → `HistoryEmptyState`; `/history` poblado → tabla | 4 | Baja |
| Cancelar job en curso → estado `cancelled` reflejado en UI | 6 | Media |

Los casos de **Escenario 8 (Reconexión)** y los relacionados con `pack_folder_to_zip`/contenido del ZIP (Escenario 3) son de **alta complejidad** para Playwright (requieren simular cortes de red o inspeccionar archivos descargados) — se recomienda mantenerlos como **manuales** incluso tras adoptar Playwright.

---

# Hallazgos

| ID | Hallazgo | Severidad | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| E2E-01 | No existe checklist de "Reconexión" (Escenario 8) previa a este documento — comportamiento real de reconexión WS no documentado | Medium | Validar manualmente y documentar comportamiento de `useDownloadSocket` ante cortes | S | P2 |
| E2E-02 | Comportamiento del ZIP con álbum de 1 track no verificado — posible generación innecesaria de `.zip` de un solo archivo | Low | Test unitario/manual dirigido en `worker.py:215-223` | XS | P3 |
| E2E-03 | Reintento de álbum parcialmente descargado — re-descarga total vs incremental [REQUIERE VALIDACIÓN] | Medium | Validar manualmente; documentar comportamiento esperado | S | P2 |
| E2E-04 | Expiración de token durante descarga activa — impacto en job en curso [REQUIERE VALIDACIÓN] | Medium | Validar manualmente; relacionar con SEC-01 | S | P2 |
| E2E-05 | Test de limpieza de suscripciones WS falla (mismo origen que TD-03) — bloquea automatización confiable de Escenario 5 | High | Resolver TD-03 antes de invertir en Playwright para Escenario 5 | M | P1 |
| E2E-06 | Historial >200 entradas — posible discrepancia entre caché Redis (`LTRIM` 200) y `GET /history` (Postgres, sin límite aparente) | Low | Validar manualmente con dataset >200; documentar comportamiento | S | P3 |

---

# Riesgos

| ID | Riesgo | Severidad |
|---|---|---|
| E2E-05 | Sin esta corrección, cualquier suite automatizada de WS (manual o Playwright) puede dar falsos negativos intermitentes | High |
| E2E-01/E2E-04 | Comportamiento no documentado ante fallos de red/expiración puede confundirse con bugs durante triage de incidentes (ver `INCIDENT_RESPONSE.md`) | Medium |
| E2E-03 | Si el reintento re-descarga álbumes completos, jobs grandes con 1 track fallido son ineficientes (impacto en `PERFORMANCE_AUDIT.md` PERF-03) | Medium |

---

# Recomendaciones

1. Priorizar **E2E-05** (resolver TD-03) — es prerequisito tanto para confiar en la suite manual de Escenario 5 como para automatizar con Playwright.
2. Ejecutar la sección "Smoke Tests" de este documento como parte del checklist de cada despliegue (referenciar desde `RUNBOOK.md`).
3. Las validaciones marcadas `[REQUIERE VALIDACIÓN]` (E2E-01, E2E-03, E2E-04, E2E-06) deben ejecutarse una vez y sus resultados incorporarse como hechos confirmados en la siguiente revisión de este documento.
4. Adoptar el plan de Playwright de `TEST_PLAN.md` Fase 4 comenzando por los casos de "Baja" complejidad de la tabla anterior.

---

# Roadmap

| Fase | Alcance | Hallazgos |
|---|---|---|
| **Fase 1** | Ejecutar validaciones `[REQUIERE VALIDACIÓN]` (E2E-01, E2E-03, E2E-04, E2E-06) y documentar resultados | E2E-01, E2E-03, E2E-04, E2E-06 |
| **Fase 2** | Resolver E2E-05 / TD-03 | E2E-05 |
| **Fase 3** | Incorporar "Smoke Tests" al runbook de despliegue | — |
| **Fase 4** | Automatizar casos de baja complejidad con Playwright (post TP-06) | E2E-05 (parcial) |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P1** | E2E-05 |
| **P2** | E2E-01, E2E-03, E2E-04 |
| **P3** | E2E-02, E2E-06 |

---

# Próximos Pasos

1. Ejecutar la suite "Smoke Tests" en el entorno actual y registrar resultados como línea base.
2. Asignar la resolución de E2E-05/TD-03 antes de cualquier inversión en Playwright.
3. Programar una sesión de validación manual para los 4 hallazgos `[REQUIERE VALIDACIÓN]` (E2E-01, E2E-03, E2E-04, E2E-06).
4. Incorporar el checklist de "Regression Tests" al proceso de release descrito en `QUALITY_GATES.md`.
