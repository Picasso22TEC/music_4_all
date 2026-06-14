# Runbook — Music 4 All

> Procedimientos operativos diarios: levantar el sistema, verificar salud, revisar logs/métricas, reiniciar/restaurar servicios y comandos frecuentes. Para procedimientos ante incidentes (servicios caídos, fallos de WS/OAuth), ver [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md). Para escenarios de pérdida de datos/infraestructura, ver [`DISASTER_RECOVERY.md`](DISASTER_RECOVERY.md).

---

# Executive Summary

Music 4 All se opera mediante `docker compose` (8 servicios: `postgres`, `valkey`, `backend`, `frontend`, `nginx`, `prometheus`, `grafana`, `loki`, `promtail` — 9 en total) o, en desarrollo, mediante procesos locales (`uv run uvicorn` + `pnpm dev`). El sistema **no tiene `restart:` policies** definidas para ningún servicio, y **solo `postgres` y `valkey` tienen healthchecks** — `backend`, `frontend` y el resto dependen de verificación manual (`GET /health`, `docker compose ps`, logs). Este runbook documenta los procedimientos disponibles **hoy** con los comandos reales del repositorio (`docs/development.md`, `docker-compose.yml`), y marca explícitamente qué automatizaciones operativas **no existen** (`[INEXISTENTE]`).

---

# Estado Actual

## Inventario de servicios (`docker-compose.yml`)

| Servicio | Imagen/build | Puerto host | Healthcheck | Restart policy | Volúmenes |
|---|---|---|---|---|---|
| `postgres` | postgres (oficial) | 5432 | ✅ `pg_isready` (10s/5s/5 retries) | `[INEXISTENTE]` | `postgres_data` |
| `valkey` | valkey (oficial) | 6379 | ✅ `valkey-cli ping` (10s/5s/3 retries) | `[INEXISTENTE]` | `valkey_data` |
| `backend` | build local (`target` dev/prod) | 8000 | `[INEXISTENTE]` | `[INEXISTENTE]` | `backend_venv`, bind `./backend:/app`, `./downloads:/app/downloads` |
| `frontend` | build local | 3000 | `[INEXISTENTE]` | `[INEXISTENTE]` | `frontend_pnpm_store`, bind `./frontend:/app` |
| `nginx` | nginx (oficial) | 80 | `[INEXISTENTE]` | `[INEXISTENTE]` | configs (ro) |
| `prometheus` | prometheus (oficial) | 9090 | `[INEXISTENTE]` | `[INEXISTENTE]` | `prometheus_data`, config (ro) |
| `grafana` | grafana (oficial) | 3001→3000 | `[INEXISTENTE]` | `[INEXISTENTE]` | `grafana_data`, provisioning (ro) |
| `loki` | loki (oficial) | 3100 | `[INEXISTENTE]` | `[INEXISTENTE]` | `loki_data`, config (ro) |
| `promtail` | promtail (oficial) | — | `[INEXISTENTE]` | `[INEXISTENTE]` | `/var/run/docker.sock` (ro), `/var/lib/docker/containers` (ro), config (ro) |

`depends_on: condition: service_healthy` está configurado para que `backend` espere a `postgres`/`valkey` saludables (confirmado en `docs/e2e-validation.md` §8).

---

# Procedimientos

## 1. Levantar el sistema completo (Docker)

```bash
docker compose up --build
```

| Servicio | URL |
|---|---|
| Aplicación (vía nginx) | http://localhost |
| Frontend directo | http://localhost:3000 |
| API directo | http://localhost:8000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin/admin — ver SEC-03, cambiar en producción) |
| Loki | http://localhost:3100 |
| PostgreSQL | localhost:5432 (`music4all`/`music4all`) |
| Valkey | localhost:6379 |

**Reconstruir solo un servicio**:
```bash
docker compose up --build backend
docker compose up --build frontend
```

**Notas críticas** (ver `docs/troubleshooting.md`):
- El backend usa el volumen nombrado `backend_venv:/app/.venv` — **nunca** montar el `.venv` de Windows del host (regla CLAUDE.md §8 "Docker / uv").
- `UV_LINK_MODE=copy` debe permanecer fijado en el entorno del servicio `backend`.

## 2. Levantar el sistema en desarrollo (sin Docker)

**Backend**:
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```
- API en `http://localhost:8000`; `/docs` solo si `DEBUG=true`.
- Requiere Valkey/Redis local (`REDIS_URL=redis://localhost:6379`) — sin él, el backend no podrá manejar sesiones OAuth ni la cola de jobs.
- `DATABASE_URL` por defecto es SQLite (`dev.db`) — para usar Postgres, exportar `DATABASE_URL=postgresql://...`.

**Frontend**:
```bash
cd frontend
pnpm install
pnpm dev
```
- App en `http://localhost:3000`. Si el backend no corre en `localhost:8000`, exportar `BACKEND_URL` antes de `pnpm dev`.

## 3. Verificar salud del sistema

| Verificación | Comando/URL | Resultado esperado |
|---|---|---|
| Backend health | `curl http://localhost:8000/health` | `{"status": "healthy", "service": "Music 4 All API", "version": "7.0.0"}` |
| Estado de contenedores | `docker compose ps` | Todos `Up`; `postgres`/`valkey` además `healthy` |
| Métricas backend | `curl http://localhost:8000/metrics` | Salida Prometheus (`music4all_*`, `http_request_duration_seconds_*`) |
| Target Prometheus | http://localhost:9090/targets | `music4all-backend` → `backend:8000` `UP` |
| Conectividad Postgres | `docker compose exec postgres pg_isready -U music4all` | `accepting connections` |
| Conectividad Valkey | `docker compose exec valkey valkey-cli ping` | `PONG` |
| Frontend | `curl -I http://localhost:3000` | `200 OK` |
| Nginx (entrada unificada) | `curl -I http://localhost/health` | `200 OK`, proxeado a backend (`access_log off`) |
| Grafana datasources | http://localhost:3001 → Connections → Data sources | `prometheus` (default), `loki` provisionados sin config manual |

> **No existe** un endpoint de health agregado que verifique Postgres/Valkey desde el backend (`/health` no comprueba dependencias) — `[INEXISTENTE]`, ver Hallazgos RB-01.

## 4. Revisar logs

```bash
# Logs de un servicio (sigue en tiempo real)
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f worker     # nota: el worker corre dentro del proceso backend, no es un servicio separado

# Últimas N líneas sin seguir
docker compose logs --tail=200 backend
```

- Los logs del backend son **JSON estructurado** (`pythonjsonlogger`): campos `timestamp`, `level`, `service` (`music4all-backend`), `logger`, `message`, y `job_id` para logs del worker (`job_logger()`).
- Vía Grafana → Explore → Loki: filtrar por `{service="backend"}` o por `job_id` extraído del pipeline de Promtail.
- Nivel de log controlado por `settings.debug` (`DEBUG=true` → `DEBUG`, si no → `INFO`) — **no** hay variable `LOG_LEVEL` directa (ver Hallazgos RB-02).

## 5. Revisar métricas (Grafana)

- Dashboard provisionado: `music4all.json` (uid `music4all-main`), 7 paneles: descargas completadas/fallidas (totales), descargas en curso, tasa de descargas/min, latencia API p50/p95, duración de descarga p50/p95, tasa de requests HTTP por handler.
- Refresh automático cada 30s, rango por defecto `now-1h` a `now`.
- **No hay panel de logs (Loki)** en el dashboard provisionado — para revisar logs usar Explore directamente (ver paso 4).
- **No hay alertas configuradas** en Prometheus (`rule_files` ausente) — ver `MONITORING.md`.

## 6. Reiniciar servicios

```bash
# Reiniciar un servicio sin reconstruir
docker compose restart backend
docker compose restart frontend

# Reiniciar todo el stack
docker compose restart
```

- Al reiniciar `backend` con jobs `downloading` pendientes, `reconcile_stale_jobs` (ejecutado en el lifespan de arranque) los marca como `failed` — **no** quedan jobs "zombie" en `downloading` indefinidamente. Ver `docs/e2e-validation.md` §6.
- Hot-reload backend (`--reload` de uvicorn): editar `backend/app/` con el contenedor corriendo reinicia automáticamente sin reconstruir.
- Hot-reload frontend: editar `frontend/src/` refleja cambios en `localhost:3000` sin reconstruir.

## 7. Detener el sistema

```bash
# Detener servicios, preservando volúmenes (datos)
docker compose down

# ⚠️ DESTRUCTIVO: detener y borrar volúmenes (Postgres, Valkey, Grafana, Prometheus, Loki)
docker compose down -v
```

`docker compose down` (sin `-v`) preserva `postgres_data`, `valkey_data`, `backend_venv` y el resto de volúmenes nombrados.

## 8. Restaurar/recuperar servicios

| Escenario | Procedimiento |
|---|---|
| `backend` no arranca tras cambio de dependencias | `docker compose up --build backend` (reconstruye `backend_venv`) |
| Volumen `backend_venv` corrupto/desincronizado | `docker compose down` (sin `-v`) → `docker volume rm <project>_backend_venv` → `docker compose up --build backend` |
| Jobs "atascados" en `downloading` tras un crash sin reinicio limpio | Reiniciar `backend` (`docker compose restart backend`) — `reconcile_stale_jobs` se ejecuta en el siguiente arranque |
| Restaurar Postgres desde backup | `[NO IMPLEMENTADO]` — ver `DISASTER_RECOVERY.md` (no existe script de backup/restore) |
| Restaurar Valkey | Valkey corre con `--appendonly yes` (AOF) — persistencia local en `valkey_data`, pero **no es backup** (ver `DISASTER_RECOVERY.md`) |

## 9. Migraciones de base de datos (Alembic)

```bash
cd backend
uv run alembic upgrade head          # aplicar migraciones pendientes
uv run alembic downgrade -1          # revertir la última
uv run alembic current               # revisión actual
uv run alembic history               # historial completo
```

- **Migraciones no se aplican automáticamente** al arrancar el contenedor (`Dockerfile` CMD es `uv run uvicorn ...`, sin paso de migración) — deben ejecutarse manualmente tras cada despliegue con cambios de esquema. Actualmente solo existe `001_initial_tables.py`.
- En el lifespan de la app, `await conn.run_sync(Base.metadata.create_all)` crea tablas si no existen (red de seguridad para entornos nuevos, pero **no sustituye** a Alembic para cambios incrementales).

## 10. Comandos frecuentes (resumen)

```bash
# --- Docker ---
docker compose up --build              # levantar todo
docker compose up --build backend      # reconstruir solo backend
docker compose ps                      # estado de servicios
docker compose logs -f backend         # logs en vivo
docker compose restart backend         # reiniciar backend
docker compose down                    # detener (preserva datos)
docker compose exec backend bash       # shell dentro del backend
docker compose exec postgres psql -U music4all -d music4all

# --- Backend (uv) ---
cd backend
uv sync
uv run uvicorn app.main:app --reload
uv run pytest -q
uv run ruff check . && uv run ruff format --check .
uv run alembic upgrade head

# --- Frontend (pnpm) ---
cd frontend
pnpm install
pnpm dev
pnpm build
pnpm lint
```

---

# Hallazgos

| ID | Hallazgo | Severidad | Recomendación | Esfuerzo | Prioridad |
|---|---|---|---|---|---|
| RB-01 | `/health` no verifica dependencias (Postgres/Valkey) — un `/health` "verde" no garantiza que el sistema funcione end-to-end | Medium | Extender `/health` a un check superficial de Postgres/Valkey, o documentar claramente que es solo liveness, no readiness | S | P2 |
| RB-02 | Nivel de log controlado solo por `DEBUG` (booleano) — no hay `LOG_LEVEL` granular (`WARNING`/`ERROR` en prod con detalle) | Low | Añadir `LOG_LEVEL` como variable independiente en `setup_logging()` | XS | P3 |
| RB-03 | `backend`/`frontend` sin healthcheck en `docker-compose.yml` — `docker compose ps` no refleja si el proceso interno está realmente sirviendo tráfico | Medium | Añadir healthcheck HTTP simple (`curl -f http://localhost:8000/health`) para `backend`; similar para `frontend` | S | P2 |
| RB-04 | Sin `restart:` policy en ningún servicio — un crash de `backend`/`postgres`/`valkey` requiere intervención manual | Medium | Añadir `restart: unless-stopped` (mínimo) a todos los servicios | XS | P2 |
| RB-05 | Sin script/automatización de restauración de Postgres/Valkey | Medium-High | Ver `DISASTER_RECOVERY.md` — definir procedimiento de backup/restore | M | P1 (vía DR) |
| RB-06 | Migraciones Alembic no se ejecutan automáticamente en el arranque del contenedor — riesgo de desincronización esquema/código si se olvida el paso manual | Medium | Documentar como paso obligatorio post-despliegue (ya cubierto en QG-14 de `QUALITY_GATES.md`); considerar paso explícito en `Dockerfile`/entrypoint para producción | S | P2 |

---

# Riesgos

| ID | Riesgo | Severidad |
|---|---|---|
| RB-03/RB-04 | Sin healthchecks ni restart policies, un fallo de `backend` puede pasar desapercibido hasta que un usuario reporte el problema (alto MTTD) | Medium-High |
| RB-05 | Sin backup, una pérdida de `postgres_data` (volumen corrupto/borrado accidental) es irrecuperable | High |
| RB-01 | Falsos positivos de "sistema saludable" si `/health` responde pero Postgres/Valkey están caídos | Medium |
| RB-06 | Despliegue con esquema desactualizado si se omite `alembic upgrade head` manualmente | Medium |

---

# Recomendaciones

1. **RB-04** (restart policies) es la mejora de menor esfuerzo y mayor impacto inmediato — `restart: unless-stopped` en todos los servicios reduce drásticamente la necesidad de intervención manual ante crashes transitorios.
2. **RB-03** (healthchecks `backend`/`frontend`) habilita además gates de despliegue más fiables (`depends_on: condition: service_healthy` extendido).
3. **RB-05** debe resolverse en conjunto con `DISASTER_RECOVERY.md` — es el hallazgo de mayor severidad de este documento.
4. RB-01/RB-02/RB-06 son mejoras incrementales de bajo riesgo, abordables en cualquier momento sin coordinación adicional.

---

# Roadmap

| Fase | Alcance | Hallazgos |
|---|---|---|
| **Fase 1** | Añadir `restart: unless-stopped` a todos los servicios de `docker-compose.yml` | RB-04 |
| **Fase 2** | Añadir healthchecks HTTP a `backend`/`frontend` | RB-03 |
| **Fase 3** | Extender `/health` con check superficial de dependencias | RB-01 |
| **Fase 4** | Documentar/automatizar `alembic upgrade head` como paso post-despliegue | RB-06 |
| **Fase 5** | Definir backup/restore de Postgres y Valkey (coordinado con `DISASTER_RECOVERY.md`) | RB-05 |
| **Fase 6** | Añadir `LOG_LEVEL` granular | RB-02 |

---

# Prioridades

| Prioridad | Hallazgos |
|---|---|
| **P1** | RB-05 |
| **P2** | RB-01, RB-03, RB-04, RB-06 |
| **P3** | RB-02 |

---

# Próximos Pasos

1. Implementar RB-04 (restart policies) — cambio de configuración de bajo riesgo, aplicable de inmediato.
2. Implementar RB-03 (healthchecks `backend`/`frontend`) en la misma PR que RB-04.
3. Coordinar RB-05 con la redacción de `DISASTER_RECOVERY.md` (siguiente documento de esta serie).
4. Incorporar RB-06 al checklist de Release Gates (`QUALITY_GATES.md` QG-14), que ya lo menciona como objetivo.
