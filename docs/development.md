# Development — Music 4 All

Guía para levantar el entorno de desarrollo, ejecutar pruebas/lint y crear migraciones.

---

## 1. Requisitos

| Herramienta | Versión mínima | Uso |
|---|---|---|
| Python | 3.11 | Backend |
| uv | 0.10+ | Gestor de dependencias Python |
| Node.js | 20 | Frontend |
| pnpm | 10+ | Gestor de paquetes Node |
| Docker + Compose | — | Entorno completo |

---

## 2. Levantar el backend (sin Docker)

```bash
cd backend
uv sync                # instala dependencias (incluye dev group)
uv run uvicorn app.main:app --reload
```

- API disponible en `http://localhost:8000`.
- Documentación interactiva en `http://localhost:8000/docs` (solo si `DEBUG=true`, ver `app/config.py`).
- Variables de entorno: copiar `.env.example` → `.env` en `backend/` (o en la raíz, según corresponda). Por defecto:
  - `REDIS_URL=redis://localhost:6379` — requiere Valkey o Redis 7 corriendo localmente (`https://valkey.io` o `redis-server`).
  - `DATABASE_URL=sqlite+aiosqlite:///./dev.db` (default en `config.py`) — para Postgres usar `postgresql://user:pass@host:5432/db` (se traduce automáticamente a `postgresql+asyncpg://`).
  - `SESSION_FILE=session.json` — usado para migrar una sesión legacy a Redis en el primer arranque.

---

## 3. Levantar el frontend (sin Docker)

```bash
cd frontend
pnpm install
pnpm dev
```

- App disponible en `http://localhost:3000`.
- `next.config.mjs` reescribe `/api/*` y `/ws/*` hacia `BACKEND_URL` (default `http://localhost:8000`). Si el backend corre en otro host/puerto, exportar `BACKEND_URL` antes de `pnpm dev`.
- `NEXT_PUBLIC_API_URL` (opcional) sobreescribe `API_BASE_URL` en `shared/config/api.config.ts` (default `/api`, usa el rewrite de Next).

---

## 4. Levantar el entorno completo con Docker

```bash
docker compose up --build
```

| Servicio | URL |
|---|---|
| Aplicación (vía nginx) | http://localhost |
| Frontend directo | http://localhost:3000 |
| API directo | http://localhost:8000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (admin/admin) |
| Loki | http://localhost:3100 |
| PostgreSQL | localhost:5432 (`music4all`/`music4all`) |
| Valkey | localhost:6379 |

Notas importantes (ver `docs/troubleshooting.md` para el detalle):
- El backend usa un **volumen nombrado `backend_venv:/app/.venv`** — no borrar este volumen ni mezclarlo con el `.venv` de Windows del host.
- `UV_LINK_MODE=copy` está fijado en el entorno del servicio `backend` — necesario porque el bind-mount `./backend:/app` es un filesystem cruzado (Windows host ↔ contenedor Linux).
- Para reconstruir solo un servicio: `docker compose up --build backend` (o `frontend`).
- Para limpiar volúmenes (destructivo, borra DB/cache): `docker compose down -v`.

---

## 5. Ejecutar pruebas

### Backend

```bash
cd backend
uv run pytest -q                 # todas las pruebas
uv run pytest tests/ -v --tb=short
uv run pytest tests/test_ws_downloads.py -v        # un archivo
uv run pytest tests/integration/ -v                 # solo integración
```

- Configuración en `pyproject.toml`: `asyncio_mode = "auto"`, `testpaths = ["tests"]`.
- Suites: `tests/` (unitarias), `tests/integration/` (flujo de descarga, endpoints), `tests/validation/` (validación de FLAC), `tests/load/locustfile.py` (pruebas de carga con Locust — ejecutar con `uv run locust -f tests/load/locustfile.py`).
- Estado conocido: **138 passed / 3 failed** — ver `docs/troubleshooting.md` (#4) y `docs/roadmap.md` para el detalle de los 3 tests fallando.
- En CI (`test-backend`), los tests corren contra `redis:7-alpine` + `postgres:16-alpine` reales (no mocks) vía servicios de GitHub Actions.

### Frontend

```bash
cd frontend
pnpm build      # type-check + compilación (no hay test runner unitario configurado)
```

No hay Jest/Vitest/Playwright configurado en `package.json` — la validación de frontend se hace vía `pnpm lint` + `pnpm build` (type-check estricto de TypeScript) + pruebas manuales en navegador.

---

## 6. Ejecutar lint / formato

### Backend

```bash
cd backend
uv run ruff check .              # lint
uv run ruff check . --fix        # autofix (87/104 errores conocidos son auto-fixables)
uv run ruff format --check .     # verificar formato
uv run ruff format .             # aplicar formato
uv run mypy app                  # type-check (no estricto — ver roadmap para errores conocidos)
uv run bandit -r app/ -ll        # escaneo de seguridad
```

### Frontend

```bash
cd frontend
pnpm lint                # next lint (ESLint + @typescript-eslint)
pnpm format              # prettier --write . (incluye plugin de orden de clases Tailwind)
```

---

## 7. Migraciones de base de datos (Alembic)

```bash
cd backend

# Crear una nueva migración a partir de cambios en app/core/models.py
uv run alembic revision --autogenerate -m "descripcion_del_cambio"

# Aplicar migraciones pendientes
uv run alembic upgrade head

# Revertir la última migración
uv run alembic downgrade -1

# Ver historial / revisión actual
uv run alembic history
uv run alembic current
```

- Configuración: `backend/alembic.ini` (`script_location = alembic`), entorno en `backend/alembic/env.py`.
- Migraciones existentes: `001` tablas iniciales, `002` columna `album`, `003` columna `user_id` (multiusuario), `004` backfill del historial sin dueño.
- Alembic usa `settings.async_database_url` — para generar/aplicar migraciones contra Postgres, exportar `DATABASE_URL=postgresql://...` antes de ejecutar (por defecto usa SQLite local `dev.db`).
- Revisar siempre el archivo de migración autogenerado antes de aplicarlo — `autogenerate` no detecta todos los cambios (renombres de columnas, algunos tipos).

### Alembic es el único dueño del esquema

La app **no** crea tablas al arrancar. Hasta la Fase 3 el lifespan de `main.py`
llamaba a `Base.metadata.create_all`, que solo crea tablas que faltan y **nunca
altera las existentes**: en una base ya desplegada, una columna nueva del modelo
simplemente no aparecía y el fallo salía en tiempo de ejecución.

- **En Docker** las migraciones las aplica `backend/docker-entrypoint.sh` antes de
  arrancar uvicorn (una sola vez por contenedor, en vez de una por worker).
- **En local sin Docker**, antes del primer arranque:
  ```bash
  cd backend
  uv run alembic upgrade head
  uv run uvicorn app.main:app --reload
  ```
- `tests/test_migrations_match_models.py` compara el esquema que producen las
  migraciones con el de los modelos: si tocas `app/core/models.py` y olvidas la
  migración, falla ahí en vez de en el despliegue.

### Adoptar una base creada por el `create_all` antiguo

Una base anterior a este cambio tiene las tablas pero **no** `alembic_version`, así
que `alembic upgrade head` intentaría crear tablas que ya existen y falla con
`DuplicateTableError: relation "downloads" already exists`. Se registra una sola vez
en la revisión que corresponda a su esquema (`002` si tiene `album` pero no
`user_id`) y a partir de ahí el flujo normal funciona:

```bash
docker exec tidal_downloader-backend-1 sh -c 'cd /app && uv run alembic stamp 002'
```

---

## 8. Convenciones de código

### Backend (Python)
- **Ruff**: `line-length = 100`, reglas activas `E, F, I, UP, B`; ignoradas `E501` (línea larga) y `B008` (uso de `Depends()` en defaults — patrón estándar de FastAPI).
- **mypy**: `python_version = "3.11"`, `strict = false`, `ignore_missing_imports = true`.
- **Arquitectura modular**: nuevos dominios van en `app/modules/<dominio>/` con `router.py` + `service.py` + `repository.py` + `schemas.py`. Infraestructura compartida en `app/core/`.
- **Errores**: usar `ApiException` (con `code`, `message`, `http_status`, `retriable`) para errores de negocio — no lanzar `HTTPException` genéricas en los módulos v2.
- **Rate limiting**: anotar endpoints sensibles con `@limiter.limit("N/minute")`.

### Frontend (TypeScript / React)
- **FSD obligatorio**: respetar dirección de dependencias `app → widgets → features → entities → shared`. Cada `features/*` expone su API vía `index.ts` (barrel export) — no importar archivos internos de otra feature directamente.
- **Componentes cliente**: cualquier componente que use hooks/Zustand/Framer Motion/`usePathname` necesita `'use client'`.
- **Estilos**: Tailwind con tokens del design system (`tailwind.config.ts`) — preferir tokens semánticos (`surface-*`, `text-*`, `semantic-*`, `teal-*`) sobre valores hardcodeados.
- **Estado**: Zustand para estado de cliente/UI (`*.store.ts`), TanStack Query para estado de servidor (`*.queries.ts` / `use*Query` / `use*Mutation`).
- **Accesibilidad**: mantener `aria-live`/`role="status"`/`role="alert"` en regiones dinámicas, `aria-label` obligatorio en botones icon-only, `focus-visible:shadow-glow-focus` en elementos interactivos.
- **ESLint + Prettier**: `eslint-config-next` + `@typescript-eslint`; Prettier con `prettier-plugin-tailwindcss` (ordena clases automáticamente).
- **Paths**: usar alias `@/...` (configurado en `tsconfig.json`), no rutas relativas largas.
