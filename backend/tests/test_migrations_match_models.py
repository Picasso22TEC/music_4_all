"""Las migraciones y los modelos no pueden divergir.

El esquema lo crea **solo** Alembic (el contenedor ejecuta `alembic upgrade head`
al arrancar). Antes lo creaba además `Base.metadata.create_all` en el lifespan, lo
que enmascaraba el problema: en una base nueva create_all levantaba el esquema de
los modelos y todo parecía bien, pero en una base ya existente **no altera nada**,
así que una columna nueva sin su migración pasaba los tests y rompía el despliegue
(exactamente lo que ocurrió con `user_id` en la Fase 3).

Aquí se construye el esquema por las dos vías —cadena de migraciones y modelos— y
se comparan. Si alguien toca un modelo y olvida la migración, falla aquí.

Alembic se invoca por subproceso a propósito: `import alembic` desde `backend/`
resuelve al directorio `backend/alembic/` del repo, no al paquete instalado. De
paso se ejercita el mismo comando que corre el contenedor al arrancar.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, inspect

from app.core.models import Base

_BACKEND_DIR = Path(__file__).resolve().parents[1]
_BIN_DIR = Path(sys.executable).parent
_ALEMBIC = next(
    (p for p in (_BIN_DIR / "alembic.exe", _BIN_DIR / "alembic") if p.exists()),
    None,
)


def _alembic(*args: str, db_path: Path) -> subprocess.CompletedProcess:
    assert _ALEMBIC is not None, f"No se encontró el ejecutable de alembic en {_BIN_DIR}"
    result = subprocess.run(
        [str(_ALEMBIC), *args],
        cwd=str(_BACKEND_DIR),
        env={**os.environ, "DATABASE_URL": f"sqlite+aiosqlite:///{db_path}"},
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"alembic {' '.join(args)} falló:\n{result.stderr}"
    return result


def _schema(db_path: Path) -> dict:
    """Esquema observable: columnas (tipo y nulabilidad) e índices por tabla."""
    engine = create_engine(f"sqlite:///{db_path}")
    try:
        insp = inspect(engine)
        return {
            table: {
                "columns": {
                    col["name"]: (str(col["type"]), bool(col["nullable"]))
                    for col in insp.get_columns(table)
                },
                "indexes": {
                    idx["name"]: tuple(idx["column_names"]) for idx in insp.get_indexes(table)
                },
            }
            for table in sorted(insp.get_table_names())
            if table != "alembic_version"  # tabla de control de alembic, no del dominio
        }
    finally:
        engine.dispose()


@pytest.fixture
def from_migrations(tmp_path) -> Path:
    db = tmp_path / "migrations.db"
    _alembic("upgrade", "head", db_path=db)
    return db


@pytest.fixture
def from_models(tmp_path) -> Path:
    db = tmp_path / "models.db"
    engine = create_engine(f"sqlite:///{db}")
    try:
        Base.metadata.create_all(engine)
    finally:
        engine.dispose()
    return db


def test_migration_chain_builds_the_model_schema(from_migrations, from_models):
    assert _schema(from_migrations) == _schema(from_models)


def test_user_id_is_present_after_migrating(from_migrations):
    # Guarda explícita de la Fase 3: el historial user-scoped depende de esta columna.
    schema = _schema(from_migrations)
    assert "user_id" in schema["downloads"]["columns"]
    assert "user_id" in schema["audit_logs"]["columns"]


def test_downgrade_removes_the_domain_tables(tmp_path):
    db = tmp_path / "roundtrip.db"
    _alembic("upgrade", "head", db_path=db)
    _alembic("downgrade", "base", db_path=db)

    assert _schema(db) == {}

    _alembic("upgrade", "head", db_path=db)  # y vuelve a subir desde cero
    assert "downloads" in _schema(db)
