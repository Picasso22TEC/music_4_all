# QA Strategy — Music 4 All

> Estrategia de calidad de Music 4 All: objetivos, KPIs, niveles de testing, herramientas, política de cobertura, roles y criterios de Definition of Ready/Done/Release Readiness. Fuente de verdad para QA junto con [`TEST_PLAN.md`](TEST_PLAN.md), [`E2E_VALIDATION.md`](E2E_VALIDATION.md) y [`QUALITY_GATES.md`](QUALITY_GATES.md). Basado en el estado real descrito en [`docs/audits/TECHNICAL_AUDIT.md`](../audits/TECHNICAL_AUDIT.md).

---

# Executive Summary

Music 4 All cuenta con una **suite de tests backend madura** (141 tests, 138 pasan, ejecutados en CI) cubriendo unit/integration de los módulos `modules/{auth,session,search,metadata,download,jobs,history}`, pero con **tres gaps estructurales**:

1. **CI no bloquea ante fallos reales de pytest** (`|| echo`) — el gate de calidad backend es, en la práctica, solo `ruff`/`ruff format`.
2. **Frontend sin ningún framework de testing** — toda la validación depende de `pnpm lint`/`pnpm build` (type-check) + pruebas manuales.
3. **Sin niveles de Contract Testing, Performance Testing real (más allá de un locustfile parcial), o Accessibility Testing automatizado**.

Esta estrategia define objetivos de calidad medibles, una pirámide de testing objetivo, y políticas de cobertura **realistas dado el tamaño actual del equipo** (no se proponen herramientas o procesos que no puedan mantenerse).

---

# Estado Actual

## 1. Objetivos de calidad

| Objetivo | Definición | Estado actual |
|---|---|---|
| **Disponibilidad** | El backend (`/health`) y el flujo de descarga responden cuando el usuario los necesita | ✅ Backend estable; sin SLO formal — ver [`SLO_SLI_SLA.md`](../operations/SLO_SLI_SLA.md) |
| **Rendimiento** | Búsquedas y descargas completan en tiempos razonables sin degradar la UI | ⚠️ Sin baseline medido — ver [`PERFORMANCE_AUDIT.md`](../audits/PERFORMANCE_AUDIT.md) |
| **Estabilidad** | El sistema no entra en estados inconsistentes (jobs zombie, sesiones huérfanas, WS desconectados) | ⚠️ `reconcile_stale_jobs` mitiga jobs zombie; 1 test de limpieza WS falla (TD-03) |
| **Seguridad** | Sin vulnerabilidades High/Critical explotables en el contexto de despliegue actual | ✅ Bandit 0 hallazgos medium/high — ver [`SECURITY_AUDIT.md`](../audits/SECURITY_AUDIT.md) |
| **Accesibilidad** | WCAG 2.1 AA en flujos críticos (Login, Dashboard, Historial) | ⚠️ Buena base (aria-live, focus-visible, skip-link); `prefers-reduced-motion` ausente — ver [`UX_AUDIT.md`](../audits/UX_AUDIT.md) |
| **Fidelidad de audio** | Las descargas preservan la calidad solicitada (MASTER/HIRES/HIGH/NORMAL) sin pérdida en la conversión | ✅ Lógica de `_finalize_raw_to_flac`/`_extract_flac_from_mp4` cubierta por tests de integración (no auditado bit-a-bit en este documento) |
| **UX** | Navegación y feedback consistentes; sin destinos rotos/vacíos | ❌ `/downloads` no existe, `/library`/`/settings` vacíos — ver [`UX_AUDIT.md`](../audits/UX_AUDIT.md) UX-01/UX-02 |

## 2. KPIs cuantificables

| KPI | Definición | Cómo medir | Objetivo propuesto | Estado actual |
|---|---|---|---|---|
| **Uptime API** | % tiempo `/health` responde 200 | Prometheus `up{job="music4all-backend"}` | 99% (autohospedado) | [NO VERIFICABLE] — sin histórico |
| **Error rate API** | % requests con status ≥500 | `http_requests_total{status=~"5.."}` (Instrumentator) | <1% | [NO VERIFICABLE] — métrica existe pero sin dashboard de error rate |
| **Tiempo de búsqueda (p95)** | Latencia `/search`, `/metadata/search` | `http_request_duration_seconds_bucket{handler="/search"}` | <2s p95 | [NO VERIFICABLE] |
| **Tiempo de descarga por track** | Duración de `download_single_track` | `music4all_download_duration_seconds` (Histogram, buckets 15s-30min) | Depende de calidad/tamaño — sin objetivo único; medir distribución | Métrica existe, sin baseline documentado |
| **Reconexión WebSocket** | Tiempo entre desconexión y reconexión exitosa de `/ws/downloads` | Frontend: tiempo entre evento `close` y `open` del socket (`useDownloadSocket`) | <5s | [NO VERIFICABLE] — sin instrumentación frontend |
| **Éxito OAuth Device Flow** | % de flujos `device-auth` que llegan a `authorized` sin error | `music4all_auth_logins_total{status="success"}` vs `{status="failure"}` | >95% | Métrica existe, sin baseline |
| **Latencia API (p50/p95)** | Panel ya existe en Grafana | `histogram_quantile(0.5/0.95, rate(http_request_duration_seconds_bucket[5m]))` | p95 <500ms para endpoints no-Tidal; p95 <3s para endpoints que llaman a Tidal | Dashboard existe (`music4all.json` panel 5), sin baseline ni alertas |
| **Cobertura de tests backend** | % líneas cubiertas por pytest | `pytest --cov` (no confirmado si está configurado — **[REQUIERE VALIDACIÓN]**) | 70% líneas en `modules/`, 50% en `core/` | [NO VERIFICABLE] — sin reporte de cobertura en CI |
| **Cobertura de tests frontend** | % líneas/branches cubiertas | Vitest coverage (no existe aún) | 50% en `entities/`+`features/` críticas tras Fase 1 de adopción | 0% (sin framework) |

> **Nota**: la mayoría de KPIs son `[NO VERIFICABLE]` no porque falte instrumentación (Prometheus + métricas custom existen, ver [`MONITORING.md`](../operations/MONITORING.md)), sino porque **no hay tráfico real/histórico ni dashboards de baseline**. La acción inmediata no es "añadir métricas" sino "generar tráfico de referencia y fijar baselines".

## 3. Niveles de testing

| Nivel | Definición | Estado actual | Herramienta actual | Herramienta recomendada |
|---|---|---|---|---|
| **Unit** | Funciones/clases aisladas (servicios, repositorios, mappers) | ✅ Backend (`tests/unit/` — inferido por estructura modular) | `pytest` | Frontend: **Vitest** |
| **Integration** | Interacción entre módulos + dependencias reales (Postgres, Redis vía testcontainers/CI services) | ✅ Backend (`tests/integration/test_download_flow.py`, `tests/test_ws_downloads.py`) | `pytest` + servicios CI (`redis:7-alpine`, Postgres) | Frontend: **Vitest + React Testing Library** para stores/hooks |
| **Contract** | Verificar que frontend y backend coinciden en formas de request/response (especialmente WS y `/ws/downloads` mensajes) | ❌ [INEXISTENTE] | — | Esquemas compartidos (Pydantic → JSON Schema → validación TS) o tests dedicados de forma de mensaje WS |
| **System** | Sistema completo vía `docker compose up` | ⚠️ Manual (`docs/e2e-validation.md`) | Checklist manual | Mantener checklist + automatizar subset crítico vía Playwright |
| **E2E** | Flujos de usuario completos (OAuth → búsqueda → descarga → historial) | ⚠️ Manual | Checklist manual (`docs/e2e-validation.md`) | **Playwright** (frontend) |
| **Performance** | Carga/concurrencia | ⚠️ Parcial — `locustfile.py` no cubre descargas/WS (ver `PERFORMANCE_AUDIT.md` PERF-05) | Locust | Extender Locust (ver `PERFORMANCE_AUDIT.md` Fase 3) |
| **Security** | SAST/escaneo de dependencias | ⚠️ Bandit no bloqueante; sin escaneo de dependencias | Bandit | Bandit bloqueante (High) + Dependabot |
| **Accessibility** | WCAG 2.1 AA automatizado | ❌ [INEXISTENTE] | — | `axe-playwright` o `@axe-core/react` integrado en Playwright E2E |

## 4. Herramientas

| Categoría | Actual | Faltante / Recomendado |
|---|---|---|
| Test runner backend | `pytest` | — |
| Cobertura backend | **[REQUIERE VALIDACIÓN]** — confirmar si `pytest-cov` está configurado | `pytest-cov` con reporte en CI (informativo primero) |
| Lint/format backend | `ruff check`, `ruff format --check` | — |
| Type-check backend | `mypy` (local, no en CI) | Añadir a CI como job informativo |
| SAST backend | `bandit` (no bloqueante) | Bloqueante en High |
| Test runner frontend | [INEXISTENTE] | **Vitest** |
| Component testing frontend | [INEXISTENTE] | **React Testing Library** |
| E2E frontend | [INEXISTENTE] | **Playwright** |
| Visual regression | [INEXISTENTE] | Playwright screenshots (opcional, fase posterior) |
| Accessibility testing | [INEXISTENTE] | `axe-playwright` |
| Load testing | `locustfile.py` (parcial) | Extender según `PERFORMANCE_AUDIT.md` |
| Dependency scanning | [INEXISTENTE] | Dependabot (GitHub nativo) |

## 5. Política de cobertura (actual vs objetivo)

| Área | Cobertura actual | Objetivo (12 meses) | Justificación |
|---|---|---|---|
| Backend `modules/*` (servicios/repositorios) | [NO VERIFICABLE] (suite existe, % no reportado) | 70% líneas | Lógica de negocio crítica (descargas, OAuth, jobs) |
| Backend `core/*` | [NO VERIFICABLE] | 50% líneas | Infraestructura transversal — priorizar `tidal.py` (god dependency, ver `ARCHITECTURE_AUDIT.md` AR-03) |
| Frontend `entities/*`, `features/*` (lógica, no UI pura) | 0% | 50% líneas en stores Zustand + hooks de TanStack Query | Mayor ROI: lógica de estado, no estilos |
| Frontend `shared/ui/*` (componentes visuales puros) | 0% | Cobertura selectiva (componentes con lógica: `ProgressBar`, `QualitySelector`, `Toast`) | No perseguir 100% en componentes puramente presentacionales |
| E2E (Playwright) | 0% | 5-8 escenarios críticos (ver `TEST_PLAN.md`) | Cubrir los flujos de `E2E_VALIDATION.md` más críticos, no exhaustividad |

> No se propone perseguir cobertura >80% en ningún área — la inversión marginal no se justifica para un equipo pequeño. El objetivo es **cobertura de lógica crítica**, no de líneas totales.

## 6. Roles y responsabilidades

| Rol | Responsabilidad en QA |
|---|---|
| **Backend dev** | Mantener/ampliar `pytest` (unit+integration) para cualquier cambio en `modules/`; resolver TD-03 (fixture roto) y TD-02 (mypy tidalapi) como parte de su deuda. |
| **Frontend dev** | Adoptar Vitest/RTL para nuevo código en `entities/`/`features/`; mantener `pnpm lint`/`pnpm build` verdes. |
| **QA (rol compartido, sin headcount dedicado confirmado — [REQUIERE VALIDACIÓN])** | Mantener `E2E_VALIDATION.md` actualizado; ejecutar checklist manual antes de releases; definir/priorizar escenarios Playwright. |
| **DevOps/Infra** | Mantener CI (`ci.yml`) — implementar `QUALITY_GATES.md`; gestionar Dependabot. |
| **Product Owner** | Decidir alcance de `/library`, `/settings`, `/downloads`, `PlayerBar` (ver `UX_AUDIT.md`) — input necesario antes de poder escribir tests E2E para esas áreas. |

> **[REQUIERE VALIDACIÓN]**: este documento asume un equipo pequeño donde los roles se solapan (backend/frontend dev también actúan como QA). Si existe un rol QA dedicado, ajustar la tabla.

## 7. Definition of Ready (DoR)

Una tarea está lista para desarrollo cuando:
- [ ] El criterio de aceptación está expresado en términos verificables (qué test, manual o automatizado, lo confirma).
- [ ] Si la tarea toca `modules/session`, `modules/download`, `modules/jobs`, o WS — se ha identificado qué tests de integración existentes podrían verse afectados (`tests/integration/`, `tests/test_ws_downloads.py`).
- [ ] Si la tarea toca `frontend/src/entities/` o `features/`, se ha identificado si requiere nuevos tests Vitest (una vez adoptado).
- [ ] Si la tarea afecta una página/ruta listada en `UX_AUDIT.md` como placeholder/inexistente (`/library`, `/settings`, `/downloads`), el Product Owner ha confirmado el alcance.

## 8. Definition of Done (DoD)

Una tarea está terminada cuando:
- [ ] `ruff check .` y `ruff format --check .` pasan (backend).
- [ ] `pnpm lint` y `pnpm build` pasan (frontend).
- [ ] `pytest` pasa para los módulos afectados (sin nuevas fallas — ver `QUALITY_GATES.md` para el estado de TD-03).
- [ ] Si se tocó un endpoint/mensaje WS, se actualizó el checklist relevante en `E2E_VALIDATION.md`.
- [ ] Si se introdujo una nueva animación continua en frontend, respeta `prefers-reduced-motion` (una vez implementado — ver `TECHNICAL_AUDIT.md` TD-13).
- [ ] Sin nuevos hallazgos Bandit de severidad High.

## 9. Release Readiness

Antes de mergear a `main`/considerar una versión "lista para uso":
- [ ] Todos los ítems de `QUALITY_GATES.md` → "Release Gates" cumplidos.
- [ ] Checklist de `E2E_VALIDATION.md` (al menos las secciones 1-7: Backend, Frontend, OAuth, Device Flow, WebSocket, Descargas, Historial) ejecutado manualmente o vía Playwright.
- [ ] Sin hallazgos **Critical** abiertos en `docs/audits/*` sin mitigación documentada.
- [ ] `docs/roadmap.md` y los audits relevantes actualizados si la release resuelve algún hallazgo documentado.

---

# Hallazgos

| ID | Hallazgo | Severidad | Impacto técnico | Impacto de negocio | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|---|---|
| QA-01 | CI no bloquea ante fallos reales de pytest (cross-ref TD-03) | High | Regresiones backend no detectadas por CI | Riesgo de desplegar bugs en flujo de descarga/OAuth | Corregir fixture + cambiar `\|\| echo` por gate real | S | P0 |
| QA-02 | Sin testing frontend (cross-ref TD-05) | High | Regresiones de UI/estado solo detectables manualmente | Riesgo de UX rota en producción | Adoptar Vitest+RTL+Playwright por fases (ver `TEST_PLAN.md`) | L | P1 |
| QA-03 | Cobertura backend no reportada en CI | Medium | No hay visibilidad de qué código carece de tests | Decisiones de priorización de testing sin datos | Añadir `pytest-cov` informativo en CI | S | P2 |
| QA-04 | Sin Contract Testing para mensajes WS (`/ws/downloads`) | Medium | Desincronización silenciosa entre `ws_mapper.py` (backend) y parsing frontend (`useDownloadSocket`) | Mensajes de progreso podrían dejar de reflejarse en UI sin error visible | Tests dedicados de forma de mensaje (backend) + parsing (frontend) | M | P2 |
| QA-05 | Sin Accessibility Testing automatizado | Medium | Regresiones de accesibilidad (aria-live, focus-visible) no detectadas | Riesgo de incumplimiento WCAG en nuevas features (relevante para rediseño neón) | `axe-playwright` en E2E críticos | M | P2 |
| QA-06 | KPIs definidos pero sin baseline/histórico | Medium | Imposible detectar degradación de rendimiento sin punto de referencia | Decisiones de capacidad basadas en estimaciones | Generar tráfico de referencia, fijar baselines en Grafana | S | P2 |
| QA-07 | Roles QA no formalizados ([REQUIERE VALIDACIÓN]) | Low | Ambigüedad sobre quién ejecuta `E2E_VALIDATION.md` | Riesgo de que el checklist manual no se ejecute consistentemente | Confirmar con el equipo y documentar | XS | P3 |

---

# Riesgos

| ID | Riesgo | Severidad |
|---|---|---|
| QA-01 | Pipeline "verde" no garantiza ausencia de regresiones backend | High |
| QA-02 | Cambios frontend sin red de seguridad automatizada | High |
| QA-04 | Drift silencioso entre contrato WS backend/frontend | Medium |
| QA-05 | Regresiones de accesibilidad no detectadas, especialmente durante el rediseño neón | Medium |
| QA-06 | Sin capacidad de detectar degradación de rendimiento | Medium |
| QA-03 | Punto ciego de cobertura backend | Medium |
| QA-07 | Checklist manual depende de disciplina individual | Low |

---

# Recomendaciones

1. **QA-01 es la prioridad absoluta** — sin un pipeline que falle de verdad, toda inversión posterior en testing puede degradarse sin que nadie lo note.
2. **QA-02** debe abordarse de forma incremental (ver fases en `TEST_PLAN.md`) — no bloquear desarrollo de features mientras se adopta.
3. **QA-06** (baselines) es barato (generar tráfico + capturar dashboards existentes) y desbloquea la validez de todos los demás KPIs.
4. **QA-04 y QA-05** son inversiones de mediano plazo, especialmente relevantes antes/durante el rediseño visual (`IMPLEMENTATION_PLAN.md`), donde el riesgo de regresión de accesibilidad y de contrato WS (WS singleton, ver `IMPLEMENTATION_PLAN.md` riesgos) es mayor.

---

# Roadmap

| Fase | Alcance | Hallazgos | Esfuerzo |
|---|---|---|---|
| **Fase 1** | Corregir CI (QA-01), fijar baselines de KPIs (QA-06) | QA-01, QA-06 | S |
| **Fase 2** | Cobertura backend informativa (QA-03) | QA-03 | S |
| **Fase 3** | Adopción Vitest+RTL (entities/features críticos) | QA-02 (parte 1) | M |
| **Fase 4** | Playwright E2E (3-5 escenarios críticos de `E2E_VALIDATION.md`) | QA-02 (parte 2) | L |
| **Fase 5** | Contract tests WS + Accessibility testing (axe-playwright) | QA-04, QA-05 | M |
| **Fase 6** | Formalizar roles QA | QA-07 | XS |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P0** | QA-01 |
| **P1** | QA-02 |
| **P2** | QA-03, QA-04, QA-05, QA-06 |
| **P3** | QA-07 |

---

# Próximos Pasos

1. Ejecutar Fase 1 — coordina con `TECHNICAL_AUDIT.md` Fase 1 (mismo fix de fixture).
2. Definir los 3-5 escenarios E2E críticos para Fase 4 junto con `docs/qa/E2E_VALIDATION.md` y `docs/qa/TEST_PLAN.md`.
3. Validar QA-07 (roles) con el equipo — determina cómo se reparte la ejecución de `E2E_VALIDATION.md`.
4. Revisar este documento cada vez que se resuelva un hallazgo de `docs/audits/TECHNICAL_AUDIT.md` relacionado con testing (TD-02, TD-03, TD-05).
