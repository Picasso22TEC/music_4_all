# Music 4 All

Descargador de música desde Tidal con interfaz web moderna.

## Estructura del proyecto

```
music4all/
├── backend/           # API FastAPI + Python 3.11
├── frontend/          # Next.js 14 + TypeScript
├── infrastructure/    # Nginx, Prometheus, Grafana, Loki
├── docs/              # Documentación y guías
├── tools/             # Utilidades manuales
└── docker-compose.yml
```

## Requisitos

| Herramienta | Versión mínima | Uso |
|---|---|---|
| Python | 3.11 | Backend |
| uv | 0.10+ | Gestor de dependencias Python |
| Node.js | 20 | Frontend |
| pnpm | 10+ | Gestor de paquetes Node |
| Docker + Compose | — | Entorno completo |

## Instalación local

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

El servidor arranca en `http://localhost:8000`. Documentación disponible en `/docs` (solo en modo debug).

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

La aplicación arranca en `http://localhost:3000`.

## Entorno completo con Docker

```bash
docker compose up --build
```

Servicios disponibles:

| Servicio | URL |
|---|---|
| Aplicación | http://localhost |
| API | http://localhost:8000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

## Flujo de trabajo con ramas

Mantén `main` como base estable y trae los cambios hacia tu rama:

```bash
git switch tu-rama
git fetch origin
git merge origin/main
```

Si prefieres historial lineal:

```bash
git rebase origin/main
```

## Tecnologías

| Área | Stack |
|---|---|
| Backend | FastAPI, Python 3.11, AsyncIO, SQLAlchemy 2, Redis, PostgreSQL |
| Frontend | Next.js 14, React 18, TypeScript, Zustand, TanStack Query |
| Infraestructura | Docker, Nginx, GitHub Actions |
| Observabilidad | Prometheus, Grafana, Loki, OpenTelemetry |

## Gestión de dependencias

- **Backend**: `pyproject.toml` + `uv.lock` gestionados con [uv](https://docs.astral.sh/uv/).
  Añadir dependencia: `uv add <paquete>`
- **Frontend**: `package.json` + `pnpm-lock.yaml` gestionados con [pnpm](https://pnpm.io/).
  Añadir dependencia: `pnpm add <paquete>`

## Licencia

MIT
