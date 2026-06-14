# Monitoring — Music 4 All

> Estado real de la pila de observabilidad (Prometheus, Grafana, Loki, Promtail, OpenTelemetry): qué está configurado, qué métricas/logs/trazas existen por componente, qué falta, y recomendaciones de dashboards y alertas. Complementa [`SLO_SLI_SLA.md`](SLO_SLI_SLA.md) (qué se promete medir) e [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md) (IR-01, depende de las alertas aquí definidas).

---

# Executive Summary

Music 4 All tiene una pila de observabilidad **desplegada y provisionada** (Prometheus + Grafana + Loki + Promtail + OpenTelemetry), lo que la coloca por delante de muchos proyectos de tamaño similar. Sin embargo, el alcance real es limitado: **un único job de scraping** (`backend:8000/metrics`), **un dashboard con 7 paneles** (sin panel de logs), **cero alertas configuradas** (`rule_files` ausente en Prometheus), y **trazas de OpenTelemetry exportadas solo a consola** (`ConsoleSpanExporter`, sin collector externo — no son utilizables operacionalmente). Loki está configurado con **retención infinita** (`retention_period: 0s`), lo que implica crecimiento de disco no acotado. Este documento detalla métricas existentes vs faltantes por componente y propone un conjunto mínimo de alertas accionables.

---

# Estado Actual

## Prometheus

- Config: `infrastructure/prometheus/prometheus.yml` (13 líneas).
- `global.scrape_interval: 15s`, `evaluation_interval: 15s`, `external_labels: {project: music4all}`.
- **Un solo job**: `music4all-backend` → `backend:8000`, `metrics_path: /metrics`, `scrape_interval: 10s`.
- `rule_files` / reglas de alerta: **`[INEXISTENTE]`**.
- No hay Alertmanager configurado en `docker-compose.yml`.
- No se scrapean métricas de `postgres`, `valkey`, `nginx`, `frontend`, ni del propio `prometheus`/`grafana`/`loki` (sin exporters: no hay `postgres_exporter`, `redis_exporter`, `nginx-prometheus-exporter`).

## Grafana

- Provisioning: `infrastructure/grafana/provisioning/datasources/prometheus.yml` (`http://prometheus:9090`, `isDefault=true`) y `loki.yml` (`http://loki:3100`, `isDefault=false`).
- Dashboard provider: `dashboard.yml` (file provider, `updateIntervalSeconds=30`).
- Dashboard único: `music4all.json` (uid `music4all-main`), refresh 30s, rango `now-1h` a `now`, **7 paneles**:
  1. Descargas completadas (total)
  2. Descargas fallidas (total)
  3. Descargas en curso
  4. Tasa de descargas (por minuto)
  5. Latencia API p50/p95
  6. Duración de descarga p50/p95
  7. Tasa de requests HTTP por handler
- **Sin panel de logs (Loki)** — el datasource Loki está provisionado pero no se usa en el dashboard.
- Credenciales: `admin`/`admin` hardcodeadas (`GF_SECURITY_ADMIN_USER`/`PASSWORD` en `docker-compose.yml`) — ver `SECURITY_AUDIT.md` SEC-03.

## Loki

- Config: `infrastructure/loki/loki-config.yml` (51 líneas).
- `auth_enabled: false`, almacenamiento `boltdb-shipper` + filesystem.
- **`retention_period: 0s`** → sin límite de retención, crecimiento de disco no acotado.
- `limits_config`: `ingestion_rate_mb=8`, `ingestion_burst_size_mb=16`, `reject_old_samples_max_age=168h`.

## Promtail

- Config: `infrastructure/promtail/promtail-config.yml` (38 líneas).
- Un job `docker` vía `docker_sd_configs` (`unix:///var/run/docker.sock`, refresh 5s), filtrado por label `com.docker.compose.project`.
- Relabels: `container`, `stream`, `service`.
- Pipeline JSON extrae `level`, `service`, `job_id` del log estructurado del backend y los promueve a labels — permite queries como `{service="backend", level="ERROR"}`.

## OpenTelemetry

- `main.py:11-14,48-51,133-135`: `TracerProvider` + `SimpleSpanProcessor(ConsoleSpanExporter())`.
- Solo `FastAPIInstrumentor` activo — **sin instrumentación de SQLAlchemy ni Redis** (no se ven spans de queries DB ni operaciones Redis).
- `SimpleSpanProcessor` exporta de forma **síncrona/bloqueante** por cada span (PERF-01, `PERFORMANCE_AUDIT.md`).
- Sin collector externo (Jaeger/Tempo/OTel Collector) — las trazas solo aparecen en `stdout`/logs del contenedor backend, **no son consultables** como trazas reales.

## Logging estructurado (backend)

- `backend/app/core/logging_config.py`: JSON via `pythonjsonlogger.jsonlogger.JsonFormatter`.
- Campos: `timestamp`, `level`, `service` (`music4all-backend`), `logger`, `message`, + `job_id` (vía `job_logger()` para logs del worker).
- Sin `request_id` — no se puede correlacionar logs de una misma request HTTP entre sí sin otro identificador.
- Nivel determinado por `settings.debug` (`DEBUG` si `true`, sino `INFO`); `uvicorn.access`/`sqlalchemy.engine` forzados a `WARNING`.

---

# Métricas Disponibles vs Faltantes por Componente

## Backend (aplicación)

| Métrica | Tipo | Estado |
|---|---|---|
| `music4all_downloads_total{status}` (completed/failed) | Counter | ✅ Disponible |
| `music4all_downloads_in_progress` | Gauge | ✅ Disponible |
| `music4all_download_duration_seconds` (buckets 15-1800s+inf) | Histogram | ✅ Disponible |
| `music4all_tracks_downloaded_total` | Counter | ✅ Disponible |
| `music4all_queue_depth` | Gauge | ✅ Disponible |
| `music4all_downloads_concurrency_limit` | Gauge | ✅ Disponible |
| `music4all_auth_logins_total{status}` (success/failure) | Counter | ✅ Disponible |
| `http_requests_total`, `http_request_duration_seconds_bucket` | Counter/Histogram | ✅ Disponible (via `prometheus-fastapi-instrumentator`) |
| Errores de WebSocket / desconexiones | — | `[INEXISTENTE]` |
| Tamaño/latencia de operaciones Redis | — | `[INEXISTENTE]` (sin instrumentación) |
| Latencia/errores de queries SQL | — | `[INEXISTENTE]` (sin instrumentación) |
| Tasa de éxito/error de llamadas a Tidal API (`tidalapi`) | — | `[INEXISTENTE]` |

## PostgreSQL

| Métrica | Estado |
|---|---|
| Conexiones activas, tamaño de tablas, locks, replication lag | `[INEXISTENTE]` — sin `postgres_exporter` |

## Valkey

| Métrica | Estado |
|---|---|
| Memoria usada, hit rate, conexiones, longitud de `music4all:queue:downloads` | `[INEXISTENTE]` — sin `redis_exporter` |

## Nginx

| Métrica | Estado |
|---|---|
| Requests/s, latencia, códigos de estado por upstream | `[INEXISTENTE]` — sin `nginx-prometheus-exporter` (aunque `prometheus-fastapi-instrumentator` ya cubre el backend directamente) |

## Frontend

| Métrica | Estado |
|---|---|
| Web Vitals (LCP, CLS, FID), errores JS en cliente | `[INEXISTENTE]` |

## Infraestructura de observabilidad (meta)

| Métrica | Estado |
|---|---|
| Uso de disco de `loki_data` (retención infinita) | `[INEXISTENTE]` — sin alerta de crecimiento |
| Salud de `prometheus`/`grafana`/`loki`/`promtail` entre sí | `[INEXISTENTE]` |

---

# Dashboards Recomendados

| Dashboard | Paneles propuestos | Estado |
|---|---|---|
| **Music4All — Overview** (existente, `music4all.json`) | 7 paneles actuales | ✅ Existe |
| **Music4All — Logs** | Panel Loki: tasa de logs por `level`, búsqueda por `job_id`, errores recientes (`level="ERROR"`) | 🎯 Propuesto — datasource ya provisionado, solo falta el dashboard |
| **Music4All — Infraestructura** | CPU/memoria de contenedores (requiere `cAdvisor` o `docker stats` exporter — `[INEXISTENTE]`), espacio en disco de volúmenes (`postgres_data`, `loki_data`) | 🎯 Propuesto, requiere exporters nuevos |
| **Music4All — WebSocket** | Conexiones activas a `/ws/downloads`, tasa de cierres con código 1008 | 🎯 Propuesto — requiere instrumentar `download/ws.py` con nuevas métricas |

---

# Alertas Recomendadas

> Ninguna alerta existe hoy (`[INEXISTENTE]`). Esta tabla propone un conjunto mínimo viable, priorizado para soportar los árboles de decisión de `INCIDENT_RESPONSE.md`.

| Alerta | Condición propuesta | Severidad (incidente) | Árbol de decisión relacionado |
|---|---|---|---|
| Backend no responde | `up{job="music4all-backend"} == 0` por > 1 min | P1 | IR "Backend caído" |
| Cola de descargas estancada | `music4all_queue_depth > 0` AND `music4all_downloads_in_progress == 0` por > 5 min | P2 | IR "Descargas fallando" (worker detenido) |
| Tasa de fallos de descarga elevada | `rate(music4all_downloads_total{status="failed"}[15m]) / rate(music4all_downloads_total[15m]) > 0.5` | P2-P3 | IR "Descargas fallando" |
| Tasa de fallos de login elevada | `rate(music4all_auth_logins_total{status="failure"}[15m]) > umbral` | P2 | IR "OAuth roto" |
| Latencia API degradada | `histogram_quantile(0.95, http_request_duration_seconds_bucket) > umbral` por > 5 min | P3 | — |
| Disco de Loki creciendo sin límite | Espacio libre en volumen `loki_data` < 10% | P4 | — (riesgo de infraestructura, no de la app) |
| `postgres`/`valkey` unhealthy | `docker compose ps` healthcheck failing (requiere exporter o script externo) | P1/P2 | IR "PostgreSQL caído" / "Valkey caído" |

**Nota**: implementar estas alertas requiere desplegar **Alertmanager** (`[INEXISTENTE]` en `docker-compose.yml`) y añadir `rule_files` a `prometheus.yml`.

---

# Hallazgos

| ID | Hallazgo | Severidad | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| MON-01 | Cero alertas configuradas (sin Alertmanager, sin `rule_files`) | High | Desplegar Alertmanager + reglas mínimas de la tabla anterior (empezar por "Backend no responde" y "Cola estancada") | M | P1 |
| MON-02 | OpenTelemetry exporta solo a consola — trazas no consultables operacionalmente | Medium | Evaluar si vale la pena un collector ligero (Tempo/Jaeger) dado el contexto de un solo usuario, o documentar como `[NO PRIORITARIO]` por ahora | M (o decisión de no hacer) | P3 |
| MON-03 | Sin exporters para Postgres/Valkey/Nginx — visibilidad nula de infraestructura subyacente | Medium | Añadir `postgres_exporter` y `redis_exporter` (bajo esfuerzo, imágenes oficiales disponibles) | S-M | P2 |
| MON-04 | Loki sin retención (`retention_period: 0s`) — crecimiento de disco no acotado | Medium | Definir retención (ej. 7-30 días) acorde al uso real de un solo usuario | XS | P2 |
| MON-05 | Sin panel de logs en Grafana a pesar de tener Loki provisionado | Low | Añadir panel de logs al dashboard existente o crear uno nuevo | S | P3 |
| MON-06 | Sin métricas de WebSocket (conexiones activas, cierres 1008) | Medium | Añadir métricas Prometheus en `download/ws.py` (Gauge de conexiones activas, Counter de cierres por código) | S | P2 |
| MON-07 | Credenciales Grafana hardcodeadas `admin`/`admin` (cross-ref SEC-03) | Medium-Critical | Ver `SECURITY_AUDIT.md` SEC-03 | S | P1 (vía SEC-03) |

---

# Riesgos

| ID | Riesgo | Severidad |
|---|---|---|
| MON-01 | Sin alertas, `INCIDENT_RESPONSE.md` IR-01 permanece sin mitigar — toda detección es reactiva | High |
| MON-04 | Crecimiento ilimitado de `loki_data` puede agotar disco del host con el tiempo, afectando a todos los servicios (incluido Postgres) | Medium |
| MON-03 | Un problema de Postgres/Valkey (ej. conexiones agotadas, memoria) sería invisible hasta manifestarse como error en el backend | Medium |
| MON-07 | Acceso no autorizado a Grafana con credenciales por defecto (cross-ref SEC-03) | Medium-Critical |

---

# Recomendaciones

1. **MON-01** es la prioridad — sin Alertmanager, ninguna otra mejora de observabilidad cierra el ciclo de "detectar → notificar". Empezar con las 2 alertas de mayor impacto ("Backend no responde", "Cola estancada").
2. **MON-04** (retención de Loki) es trivial y debe hacerse pronto para evitar un incidente de disco lleno a mediano plazo.
3. **MON-03** (exporters Postgres/Valkey) es la base necesaria para que las alertas de "PostgreSQL caído"/"Valkey caído" de la tabla de alertas sean implementables con Prometheus (alternativa: usar los healthchecks de Docker ya existentes con un exporter de estado de contenedores).
4. **MON-02** (OTel a collector real) es la de menor prioridad dado el contexto de un solo usuario — considerar posponerla indefinidamente salvo que se decida escalar a multi-usuario (cross-ref `ARCHITECTURE_AUDIT.md` AR-02).

---

# Roadmap

| Fase | Alcance | Hallazgos |
|---|---|---|
| **Fase 1** | Definir retención de Loki (MON-04); resolver SEC-03/MON-07 (credenciales Grafana) | MON-04, MON-07 |
| **Fase 2** | Desplegar Alertmanager + reglas mínimas (backend caído, cola estancada) | MON-01 |
| **Fase 3** | Añadir `postgres_exporter`/`redis_exporter` + alertas de infraestructura | MON-03 |
| **Fase 4** | Métricas de WebSocket + dashboard de logs | MON-05, MON-06 |
| **Fase 5 (opcional)** | Evaluar collector OTel real si el proyecto escala a multi-usuario | MON-02 |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P1** | MON-01, MON-07 |
| **P2** | MON-03, MON-04, MON-06 |
| **P3** | MON-02, MON-05 |

---

# Próximos Pasos

1. Resolver MON-07/SEC-03 (credenciales Grafana) — trivial y de seguridad.
2. Configurar retención de Loki (MON-04) — cambio de una línea en `loki-config.yml`.
3. Diseñar e implementar las 2 alertas de mayor prioridad de MON-01 junto con el despliegue de Alertmanager.
4. Una vez Fase 2 completada, reevaluar si MON-03/MON-06 son necesarias o si las alertas de aplicación (`music4all_*`) ya cubren los escenarios más probables dado el contexto de un solo usuario.
