# Quality Gates — Music 4 All

> Criterios obligatorios y recomendados para permitir el avance de un cambio a través de las distintas etapas: merge a `main`, release/despliegue, producción, y rollback. Formaliza, como gates verificables, los criterios ya descritos en [`QA_STRATEGY.md`](QA_STRATEGY.md) (DoD/Release Readiness) y los hallazgos de [`TECHNICAL_AUDIT.md`](../audits/TECHNICAL_AUDIT.md) y [`SECURITY_AUDIT.md`](../audits/SECURITY_AUDIT.md).

---

# Executive Summary

Music 4 All cuenta con un pipeline de CI (`.github/workflows/ci.yml`) que ya implementa **2 de los 4 gates de merge recomendados** como bloqueantes (`lint-backend`, `build-frontend`), pero **2 gates críticos son actualmente no bloqueantes** (`test-backend` con `|| echo`, `security-backend`/bandit con `|| true`) — TD-03 y TD-04 de `TECHNICAL_AUDIT.md`. No existen **Production Gates** ni **Rollback Gates** formales — el job `deploy` está completamente comentado (stub inactivo). Este documento define el estado objetivo de cada gate y marca explícitamente cuáles son `[NO IMPLEMENTADO]` hoy.

---

# Estado Actual

| Gate | Tipo | Estado actual | Bloqueante hoy |
|---|---|---|---|
| `ruff check` (backend) | Merge Gate | Implementado (`ci.yml` job `lint-backend`) | Sí |
| `ruff format --check` (backend) | Merge Gate | Implementado (mismo job) | Sí |
| `pnpm lint` (frontend) | Merge Gate | Implementado (`ci.yml` job `build-frontend`) | Sí |
| `pnpm build` / `next build` (frontend) | Merge Gate | Implementado (mismo job) | Sí |
| `pytest` (backend) | Merge Gate | Implementado pero **no bloqueante** (`\|\| echo "No tests found — skipping"`) | No (TD-03) |
| `bandit` (backend) | Security Gate | Implementado pero **no bloqueante** (`\|\| true`) | No (TD-04/SEC-09) |
| Cobertura mínima backend | Merge Gate | `[NO IMPLEMENTADO]` — sin `pytest-cov` (TP-01) | No |
| Cobertura mínima frontend | Merge Gate | `[NO IMPLEMENTADO]` — sin tests frontend (TP-04) | No |
| Escaneo de dependencias (`pip-audit`/`npm audit`) | Security Gate | `[NO IMPLEMENTADO]` (SEC-05) | No |
| Validación OAuth Device Flow | Release Gate | `[NO IMPLEMENTADO]` como gate automatizado — checklist manual (`E2E_VALIDATION.md`) | No |
| Validación WebSocket (`/ws/downloads`) | Release Gate | `[NO IMPLEMENTADO]` como gate automatizado — checklist manual + 1 test fallando | No |
| `docker-build` (backend `production` + frontend `builder`) | Merge Gate | Implementado, depende de los 3 jobs anteriores | Sí (condicional) |
| Despliegue a producción | Production Gate | `[NO IMPLEMENTADO]` — job `deploy` comentado | N/A |
| Rollback | Rollback Gate | `[NO IMPLEMENTADO]` — sin estrategia documentada | N/A |

---

# Merge Gates (PR → `main`)

Criterios obligatorios antes de hacer merge de un Pull Request a `main`. Estado **objetivo** (= ya bloqueante, = objetivo a implementar):

| ID | Criterio | Comando | Estado |
|---|---|---|---|
| QG-01 | Lint backend sin errores | `uv run ruff check .` | Bloqueante |
| QG-02 | Formato backend correcto | `uv run ruff format --check .` | Bloqueante |
| QG-03 | Lint frontend sin errores ni warnings | `pnpm lint` | Bloqueante |
| QG-04 | Build frontend exitoso (type-check incluido) | `pnpm build` | Bloqueante |
| QG-05 | Suite pytest backend pasa al 100% | `uv run pytest -q` | Objetivo (hoy: 3 tests fallando, TD-03 — no bloqueante) |
| QG-06 | Bandit sin hallazgos High/Critical | `uv run bandit -r app/ -ll` | Objetivo (hoy: `\|\| true`, no bloqueante; local: 0 hallazgos) |
| QG-07 | Cobertura backend ≥ umbral acordado | `pytest --cov` | Objetivo — requiere TP-01 (`pytest-cov`) primero, luego fijar umbral |
| QG-08 | Sin nuevas dependencias con vulnerabilidades Critical/High conocidas | `pip-audit` / `npm audit --audit-level=high` | Objetivo — requiere SEC-05 (no implementado) |
| QG-09 | `docker-build` exitoso (backend `production` + frontend `builder`) | `docker compose build` | Bloqueante (depende de QG-01/03/06) |

**Regla de aplicación**: QG-05 y QG-06 deben pasar de "no bloqueante" a "bloqueante" en `ci.yml` **únicamente después de** resolver TD-03 (3 tests fallando) y confirmar 0 hallazgos High/Critical en bandit de forma estable — de lo contrario, activar el gate bloquearía todo merge inmediatamente.

---

# Release Gates (rama lista → tag/build de release)

Criterios adicionales antes de considerar una rama "lista para release", más allá de los Merge Gates (que ya deben estar en verde):

| ID | Criterio | Verificación | Estado |
|---|---|---|---|
| QG-10 | Smoke Tests de `E2E_VALIDATION.md` ejecutados y en verde | Manual (checklist, 8 ítems) | Objetivo — `[NO IMPLEMENTADO]` como proceso formal |
| QG-11 | OAuth Device Flow validado end-to-end (Escenario 1 de `E2E_VALIDATION.md`) | Manual | Objetivo |
| QG-12 | WebSocket `/ws/downloads` validado: conexión autenticada, `ping`/`pong`, `progress`, cierre 1008 sin sesión | Manual + `tests/test_ws_downloads.py` | Objetivo (bloqueado por E2E-05/TD-03 hasta resolución) |
| QG-13 | Descarga de track único y de álbum (ZIP) validadas (Escenario 3 de `E2E_VALIDATION.md`) | Manual | Objetivo |
| QG-14 | Migraciones Alembic aplican sin error sobre una copia de la base actual (`alembic upgrade head`) | Manual/CI | Objetivo — hoy sin paso de migración en el entrypoint Docker |
| QG-15 | Changelog/notas de release actualizadas | Manual | `[NO VERIFICABLE]` — sin convención de changelog confirmada |

---

# Production Gates (build de release → despliegue)

> Estado actual: **`[NO IMPLEMENTADO]`**. El job `deploy` de `ci.yml` (líneas 184-202) está completamente comentado — no existe pipeline de despliegue activo. Esta sección define los gates **objetivo** para cuando se active.

| ID | Criterio | Estado |
|---|---|---|
| QG-16 | Variables de entorno de producción (`SECRET_KEY`, credenciales Postgres/Redis, `GF_SECURITY_ADMIN_PASSWORD`) provienen de secretos gestionados, no de valores hardcodeados en `docker-compose.yml` (SEC-03) | Objetivo — bloqueante de seguridad antes de cualquier despliegue público |
| QG-17 | `CORS_ORIGINS` configurado con el/los dominios reales de producción, sin `localhost` | Objetivo |
| QG-18 | Healthchecks de `backend` definidos en `docker-compose.yml` (hoy solo `postgres`/`valkey` los tienen) | Objetivo |
| QG-19 | Límites de recursos (`deploy.resources`) definidos para servicios con uso intensivo de CPU/memoria (backend, worker, ffmpeg) — PERF-03 | Objetivo |
| QG-20 | HSTS habilitado en Nginx (actualmente comentado, SEC-04) si se sirve sobre HTTPS | Objetivo |
| QG-21 | Backup de `postgres_data` ejecutado y verificado antes del despliegue (ver `DISASTER_RECOVERY.md`) | Objetivo |

---

# Rollback Gates

> Estado actual: **`[NO IMPLEMENTADO]`** — sin estrategia de rollback documentada ni automatizada. Gates objetivo:

| ID | Criterio | Estado |
|---|---|---|
| QG-22 | Existe un procedimiento documentado para volver a la imagen Docker anterior (`docker compose` con tag previo) | Objetivo — ver `RUNBOOK.md`/`DISASTER_RECOVERY.md` |
| QG-23 | Migraciones Alembic tienen `downgrade()` probado para la migración más reciente antes de aplicarla en producción | Objetivo — `001_initial_tables.py` es la única migración existente; `[REQUIERE VALIDACIÓN]` si su `downgrade()` está implementado y probado |
| QG-24 | Criterio de decisión de rollback definido (ej.: tasa de error HTTP 5xx > X% durante Y minutos tras despliegue) | Objetivo — depende de `SLO_SLI_SLA.md` |

---

# Hallazgos

| ID | Hallazgo | Severidad | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| QG-A | `test-backend` no es bloqueante (`\|\| echo`) | High | Activar como bloqueante tras resolver TD-03 | S | P1 |
| QG-B | `security-backend`/bandit no es bloqueante (`\|\| true`) | Medium | Activar como bloqueante con umbral `-ll` (medium+) | S | P2 |
| QG-C | Sin cobertura mínima definida ni medida (backend ni frontend) | Medium | Depende de TP-01 (backend) y TP-04 (frontend) de `TEST_PLAN.md` | M | P2 |
| QG-D | Sin escaneo de dependencias (SEC-05) | Medium | Añadir `pip-audit`/`npm audit` como job informativo primero | S | P2 |
| QG-E | Sin Production Gates ni pipeline de despliegue activo | Medium (Alta si se planea exponer públicamente) | Definir gates QG-16 a QG-21 antes de activar `deploy` | M | P2 |
| QG-F | Sin Rollback Gates ni estrategia documentada | Medium | Definir junto con `DISASTER_RECOVERY.md` | M | P2 |
| QG-G | QG-12 (gate de WebSocket) bloqueado transitivamente por TD-03/E2E-05 | High | Resolver TD-03 primero | M | P1 |

---

# Riesgos

| ID | Riesgo | Severidad |
|---|---|---|
| QG-A/QG-G | Regresiones en backend (incl. WS) pueden mergearse a `main` sin detección automática | High |
| QG-B | Vulnerabilidades de seguridad introducidas no bloquean merges | Medium |
| QG-E | Sin gates de producción, cualquier futuro despliegue carecería de verificación de configuración segura (riesgo directo con SEC-03: credenciales hardcodeadas) | Medium→Critical si se expone públicamente |
| QG-F | Sin estrategia de rollback, un despliegue fallido requeriría intervención manual no planificada, aumentando MTTR | Medium |

---

# Recomendaciones

1. **Orden de implementación recomendado**: (1) resolver TD-03 → (2) activar QG-05 como bloqueante → (3) activar QG-06 (bandit) → (4) TP-01 (pytest-cov) → (5) definir umbral QG-07 → (6) abordar QG-D (escaneo de dependencias, informativo primero).
2. No activar `deploy` (Production Gates) hasta resolver SEC-03 (credenciales hardcodeadas) — activar un pipeline de despliegue con esas credenciales materializaría el riesgo Critical descrito en `SECURITY_AUDIT.md`.
3. Los Release Gates (QG-10 a QG-15) pueden formalizarse como un **checklist de PR template** o **issue template** de "Release", reutilizando directamente las secciones de `E2E_VALIDATION.md`, sin requerir automatización inmediata.
4. Definir QG-24 (criterio de rollback) en conjunto con `SLO_SLI_SLA.md` — el umbral de error debe derivarse de los SLOs allí definidos, no fijarse arbitrariamente aquí.

---

# Roadmap

| Fase | Alcance | Hallazgos |
|---|---|---|
| **Fase 1** | Resolver TD-03; activar QG-05 (pytest) como bloqueante | QG-A, QG-G |
| **Fase 2** | Activar QG-06 (bandit) como bloqueante | QG-B |
| **Fase 3** | TP-01 (pytest-cov) + definir umbral QG-07 | QG-C |
| **Fase 4** | Añadir QG-D (escaneo de dependencias, informativo) | QG-D |
| **Fase 5** | Definir y documentar Release Gates como checklist de PR | QG-10–QG-15 |
| **Fase 6** | Resolver SEC-03; definir Production Gates (QG-16–QG-21) antes de activar `deploy` | QG-E |
| **Fase 7** | Definir Rollback Gates junto con `DISASTER_RECOVERY.md` | QG-F |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P1** | QG-A, QG-G |
| **P2** | QG-B, QG-C, QG-D, QG-E, QG-F |

---

# Próximos Pasos

1. Resolver TD-03 (3 tests backend fallando) — desbloquea QG-A, QG-G y es prerequisito para todo lo demás en este documento.
2. Activar bandit (QG-B) como bloqueante con severidad `-ll` tras confirmar estabilidad (0 hallazgos en al menos 2-3 ejecuciones consecutivas).
3. Crear el checklist de PR de "Release" basado en las secciones de `E2E_VALIDATION.md` (Fase 5) — es el ítem de menor esfuerzo con mayor impacto inmediato en calidad de releases.
4. No iniciar Fase 6 (Production Gates) sin coordinar con la resolución de SEC-03.
