# Disaster Recovery — Music 4 All

> Escenarios de pérdida/corrupción de datos o infraestructura, con RTO/RPO estimados, estrategias de backup/restauración (actuales vs propuestas) y riesgos. Complementa [`RUNBOOK.md`](RUNBOOK.md) (procedimientos de recuperación operativos) e [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md) (cuándo escalar un incidente a este documento).

---

# Executive Summary

**Hallazgo central de este documento: Music 4 All no tiene ninguna estrategia de backup implementada para PostgreSQL ni para los volúmenes de observabilidad (Grafana/Loki/Prometheus).** Valkey tiene persistencia local vía AOF (`--appendonly yes`), pero **AOF no es un backup** (un volumen Docker borrado o un host caído se lleva el AOF con él). Para los 6 escenarios definidos, el **RPO actual es "todo lo no respaldado externamente" (potencialmente el historial completo)** y el **RTO depende enteramente de la disponibilidad de los artefactos de despliegue** (código en git, imágenes Docker) — los datos persistentes (`postgres_data`, `valkey_data`, `grafana_data`, `loki_data`, `prometheus_data`, y los **archivos de audio descargados** en `./downloads`) **no tienen ninguna copia fuera del host**. Dado que el proyecto es autohospedado por un solo usuario, el impacto de negocio de perder el historial de descargas es bajo, pero perder los **archivos de audio ya descargados** (`./downloads`, bind mount sin volumen Docker dedicado) podría representar horas de redescarga.

---

# Estado Actual — Inventario de datos persistentes

| Dato | Ubicación | Mecanismo de persistencia actual | Backup externo |
|---|---|---|---|
| Historial de descargas, audit logs | Volumen `postgres_data` (Postgres) | Volumen Docker | `[INEXISTENTE]` |
| Sesiones OAuth, cola de jobs, estado de jobs (TTL 24h) | Volumen `valkey_data` (Valkey, AOF `--appendonly yes`) | AOF (durabilidad local) | `[INEXISTENTE]` |
| Archivos de audio descargados | `./downloads` (bind mount host) | Filesystem del host | `[INEXISTENTE]` |
| Dashboards/datasources de Grafana | Volumen `grafana_data` + provisioning (en git) | Provisioning re-creable desde git; estado adicional (usuarios, cambios manuales) en `grafana_data` | `[INEXISTENTE]` para `grafana_data`; provisioning **sí** está en git |
| Logs históricos | Volumen `loki_data` | Volumen Docker, sin retención (`retention_period: 0s`) | `[INEXISTENTE]` (y de bajo valor — son logs, no datos de negocio) |
| Métricas históricas | Volumen `prometheus_data` | Volumen Docker | `[INEXISTENTE]` (de bajo valor — recreable observando desde cero) |
| Código de aplicación, configuración, migraciones | Git (`main` + ramas) | Repositorio remoto (asumido GitHub, dado `gh`/CI) | ✅ Sí — git es el backup |
| Imágenes Docker construidas | Local (build cache) o registro `[NO VERIFICABLE]` | `[NO VERIFICABLE]` si se publican a un registro | `[NO VERIFICABLE]` |

---

# Escenarios

## DR-01: Pérdida o corrupción de PostgreSQL (`postgres_data`)

- **Causa posible**: borrado accidental del volumen (`docker compose down -v`), corrupción de disco del host, error humano (`DROP TABLE`).
- **Datos afectados**: tabla `downloads` (historial completo), tabla `audit_logs`.
- **Impacto de negocio**: Bajo-Medio — el usuario pierde el historial de descargas pasadas (no afecta la capacidad de descargar archivos nuevos, ya que el estado de jobs activos vive en Valkey, no Postgres).
- **RPO actual**: **Total** (sin backups, RPO = "desde el inicio del proyecto" — se pierde todo el historial).
- **RTO actual**: Rápido para *recrear* el esquema vacío (`alembic upgrade head` o `Base.metadata.create_all` al arrancar), pero **los datos históricos son irrecuperables**.
- **Estrategia actual**: `[INEXISTENTE]`.
- **Estrategia propuesta**: `pg_dump` periódico (cron del host o contenedor sidecar) a un destino fuera del volumen Docker (ej. carpeta del host fuera de `postgres_data`, o almacenamiento externo). Dado el volumen de datos esperado (historial de un solo usuario), un dump diario es más que suficiente.

## DR-02: Pérdida de Valkey (`valkey_data`)

- **Causa posible**: borrado de volumen, corrupción de AOF.
- **Datos afectados**: sesión OAuth activa (`music4all:session`), cola de descargas pendientes (`music4all:queue:downloads`), estado de jobs en curso (`music4all:job:{id}`, TTL 24h de cualquier forma), caché de historial reciente (`music4all:downloads:history`, lista capada a 200 — derivable de Postgres).
- **Impacto de negocio**: Bajo — todo lo almacenado en Valkey es **efímero por diseño** (TTLs cortos, o re-derivable). El usuario tendría que volver a autenticarse (OAuth) y volver a encolar descargas pendientes.
- **RPO actual**: N/A en la práctica — la naturaleza efímera de los datos hace que un RPO de "0" sea aceptable (no hay nada que "valga la pena" respaldar aquí más allá del AOF local).
- **RTO actual**: Inmediato — `docker compose up valkey` recrea un Valkey vacío; el sistema vuelve a un estado funcional (requiere re-login y re-encolar jobs).
- **Estrategia actual**: AOF local (`valkey_data`) — suficiente para sobrevivir un **reinicio** del contenedor, no una **pérdida del volumen**.
- **Estrategia propuesta**: Ninguna adicional necesaria dado el carácter efímero de los datos — documentar este escenario como "bajo riesgo, recuperación trivial" en lugar de invertir en backups.

## DR-03: Caída del VPS/host completo

- **Causa posible**: fallo de hardware del proveedor, eliminación accidental de la instancia, problema de facturación con el proveedor.
- **Datos afectados**: **todo** lo que no esté en git — `postgres_data`, `valkey_data`, `grafana_data`, `loki_data`, `prometheus_data`, **y `./downloads` (archivos de audio ya descargados)**.
- **Impacto de negocio**: Alto si incluye `./downloads` con una biblioteca grande ya descargada — el "producto" del trabajo del usuario (música descargada) se perdería íntegramente. Medio para el resto (historial, observabilidad — recreables/de bajo valor).
- **RPO actual**: Total para todos los datos no versionados en git.
- **RTO actual**: Depende de: (1) tiempo de provisión de un nuevo host, (2) `git clone` + `docker compose up --build` (rápido, minutos), (3) **re-descarga manual de toda la biblioteca de audio** (puede ser horas/días dependiendo del tamaño).
- **Estrategia actual**: `[INEXISTENTE]` — código en git es la única red de seguridad.
- **Estrategia propuesta**: Backup periódico de `./downloads` a almacenamiento externo (es el activo de mayor valor y mayor costo de regeneración). `postgres_data`/observabilidad siguen DR-01 (bajo prioridad).

## DR-04: Corrupción de Docker (imágenes, volúmenes, daemon)

- **Causa posible**: actualización fallida de Docker Desktop/Engine, corrupción del almacenamiento de Docker en el host.
- **Datos afectados**: potencialmente todos los volúmenes nombrados (`postgres_data`, `valkey_data`, `backend_venv`, `frontend_pnpm_store`, `prometheus_data`, `grafana_data`, `loki_data`) — los bind mounts (`./backend`, `./frontend`, `./downloads`, configs) **no** se ven afectados (viven en el filesystem del host, fuera de Docker).
- **Impacto de negocio**: Medio — `./downloads` (bind mount) sobreviviría; el resto sigue DR-01/DR-02.
- **RPO/RTO**: Igual que DR-01/DR-02 para los volúmenes Docker afectados; `backend_venv`/`frontend_pnpm_store` son cachés reconstruibles (`docker compose up --build`, RTO = tiempo de build).
- **Estrategia actual**: Ninguna específica — mitigado parcialmente por el hecho de que el dato de mayor valor (`./downloads`) es un bind mount, no un volumen Docker.
- **Estrategia propuesta**: Ninguna adicional — cubierto por DR-01/DR-03.

## DR-05: Pérdida de Grafana/Loki/Prometheus (`grafana_data`/`loki_data`/`prometheus_data`)

- **Causa posible**: borrado de volúmenes, corrupción.
- **Datos afectados**: dashboards modificados manualmente en Grafana (no provisionados, si los hubiera), historial de métricas/logs.
- **Impacto de negocio**: Bajo — observabilidad es recreable desde cero; los dashboards/datasources **provisionados** (`infrastructure/grafana/provisioning/`) están en git y se re-provisionan automáticamente al recrear el contenedor.
- **RPO actual**: Total para datos no provisionados (cambios manuales en Grafana); N/A para lo provisionado (está en git).
- **RTO actual**: Inmediato — `docker compose up` re-provisiona dashboards/datasources desde git.
- **Estrategia actual**: Provisioning en git ya actúa como "backup" de la configuración base.
- **Estrategia propuesta**: Ninguna — riesgo aceptado. Si se hacen cambios manuales importantes en Grafana, exportarlos a JSON y commitearlos a `infrastructure/grafana/provisioning/dashboards/`.

## DR-06: Pérdida de descargas (jobs en curso al momento del incidente)

- **Causa posible**: cualquiera de los escenarios anteriores ocurriendo mientras hay jobs `downloading`/`queued`.
- **Datos afectados**: progreso de jobs activos (en Valkey, TTL 24h) y archivos parcialmente descargados en `./downloads` (carpetas temporales antes del `pack_folder_to_zip`).
- **Impacto de negocio**: Bajo — `reconcile_stale_jobs` marca los jobs como `failed` al reiniciar (`RUNBOOK.md` §6); el usuario simplemente vuelve a lanzar la descarga (acción de **Reintento**, `E2E_VALIDATION.md` Escenario 7).
- **RPO/RTO**: Inmediato — no hay "recuperación" real, es re-ejecución.
- **Estrategia actual**: `reconcile_stale_jobs` ya cubre este caso adecuadamente.
- **Estrategia propuesta**: Ninguna — comportamiento actual es apropiado. Verificar que archivos parciales/carpetas temporales en `./downloads` se limpien (o al menos no causen confusión) tras un job marcado `failed` por reconciliación — **[REQUIERE VALIDACIÓN]**.

---

# Tabla resumen RTO/RPO

| Escenario | RPO actual | RTO actual | Severidad de negocio |
|---|---|---|---|
| DR-01 PostgreSQL | Total (sin backup) | Rápido (esquema vacío) | Bajo-Medio |
| DR-02 Valkey | N/A (efímero) | Inmediato | Bajo |
| DR-03 VPS completo | Total (sin `./downloads` ni Postgres) | Horas-días (re-descarga biblioteca) | **Alto** |
| DR-04 Docker corrupto | Igual que DR-01/DR-02 para volúmenes; `./downloads` ileso | Tiempo de build | Medio |
| DR-05 Grafana/Loki/Prometheus | Total para no provisionado; N/A para provisionado (git) | Inmediato | Bajo |
| DR-06 Jobs en curso | Inmediato (re-ejecución) | Inmediato | Bajo |

---

# Hallazgos

| ID | Hallazgo | Severidad | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| DR-01 | Sin backup de `postgres_data` — pérdida total de historial ante DR-01/DR-03/DR-04 | Medium | `pg_dump` periódico a destino fuera del volumen Docker | S | P2 |
| DR-02 | Sin backup de `./downloads` — pérdida de la biblioteca de audio descargada ante DR-03 (caída de host) | **High** | Backup periódico de `./downloads` a almacenamiento externo (mayor activo de valor del proyecto) | M (depende del tamaño de la biblioteca y destino elegido) | **P1** |
| DR-03 | Sin verificación de limpieza de archivos/carpetas parciales tras `reconcile_stale_jobs` (DR-06) [REQUIERE VALIDACIÓN] | Low | Validar manualmente; documentar comportamiento | S | P3 |
| DR-04 | Sin documentación de qué imágenes Docker están publicadas en un registro vs solo locales — afecta RTO de DR-03 | Medium | Documentar/automatizar publicación de imágenes a un registro (GHCR u otro) como parte de CI | M | P2 |
| DR-05 | Sin runbook de restauración paso a paso para ninguno de los escenarios — solo análisis, sin procedimiento ejecutable | Medium | Una vez implementados DR-01/DR-02 (backups), documentar el procedimiento de *restore* correspondiente en `RUNBOOK.md` | S | P2 |

---

# Riesgos

| ID | Riesgo | Severidad |
|---|---|---|
| DR-02 | Pérdida del host = pérdida de toda la música ya descargada, el activo de mayor valor tangible del proyecto | **High** |
| DR-01 | Pérdida de historial reduce la utilidad de `/history` pero no es bloqueante funcional | Medium |
| DR-04 | Si las imágenes Docker no están en un registro externo, recrear el sistema tras DR-03 requiere reconstruir desde código (más lento, pero viable vía git) | Medium |
| DR-03/DR-05 | Sin procedimientos de restore documentados, incluso con backups, el RTO real dependería de improvisación bajo presión | Medium |

---

# Recomendaciones

1. **DR-02 (backup de `./downloads`) es, con diferencia, la prioridad más alta de este documento** — es el único escenario con severidad de negocio "Alta", y el dato es irremplazable sin tiempo significativo de re-descarga.
2. **DR-01 (backup de Postgres)** es de bajo esfuerzo (`pg_dump` + cron) y debería implementarse en la misma iniciativa que DR-02, reutilizando el mismo destino de almacenamiento externo.
3. No invertir en backups para DR-02 (Valkey)/DR-05 (observabilidad) — el análisis confirma que el riesgo es bajo y la recuperación es trivial o ya está cubierta por git/provisioning.
4. Documentar los procedimientos de *restore* (DR-05 de la tabla de hallazgos) inmediatamente después de implementar cada backup — un backup sin procedimiento de restore probado **no es un backup confiable**.

---

# Roadmap

| Fase | Alcance | Hallazgos |
|---|---|---|
| **Fase 1** | Definir destino de backup externo (almacenamiento elegido por el usuario: NAS, cloud storage, disco externo, etc. — decisión fuera del alcance técnico de este documento) | — |
| **Fase 2** | Implementar backup periódico de `./downloads` | DR-02 |
| **Fase 3** | Implementar `pg_dump` periódico de `postgres_data` | DR-01 |
| **Fase 4** | Documentar y probar procedimientos de *restore* para Fase 2/3 en `RUNBOOK.md` | DR-05 |
| **Fase 5** | Validar limpieza de archivos parciales tras `reconcile_stale_jobs` | DR-03 |
| **Fase 6** | Evaluar publicación de imágenes Docker a un registro externo | DR-04 |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P1** | DR-02 |
| **P2** | DR-01, DR-04, DR-05 |
| **P3** | DR-03 |

---

# Próximos Pasos

1. Decidir el destino de almacenamiento externo para backups (Fase 1) — esta decisión bloquea DR-01 y DR-02 por igual y debe tomarla el usuario según su infraestructura disponible.
2. Implementar DR-02 (backup de `./downloads`) tan pronto como Fase 1 esté resuelta — es la acción de mayor impacto de todo este documento.
3. Implementar DR-01 (`pg_dump`) en la misma iniciativa, reutilizando el destino de Fase 1.
4. Probar al menos una vez el procedimiento de restore de DR-02 (restaurar `./downloads` desde el backup a un directorio de prueba) antes de considerar la estrategia "validada".
