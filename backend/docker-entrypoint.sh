#!/bin/sh
# Aplica las migraciones y cede el control al comando del contenedor (CMD).
#
# El esquema es responsabilidad exclusiva de Alembic: la app ya no llama a
# `create_all` al arrancar (no altera tablas existentes, así que las bases ya
# desplegadas se quedaban sin las columnas nuevas).
#
# Aquí y no en el lifespan de FastAPI porque el target de producción arranca
# uvicorn con varios workers: cada worker ejecutaría su propio lifespan y varias
# migraciones correrían a la vez sobre la misma base. El entrypoint corre una
# sola vez por contenedor, antes de que exista ningún worker.
set -e

echo "[entrypoint] Aplicando migraciones (alembic upgrade head)..."
uv run alembic upgrade head

echo "[entrypoint] Migraciones al día. Arrancando: $*"
exec "$@"
