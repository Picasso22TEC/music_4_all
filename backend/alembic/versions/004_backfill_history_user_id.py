"""Backfill user_id en el historial anterior al multiusuario

Las filas creadas en la etapa de usuario único no tienen dueño y, como el
historial filtra por user_id, quedan invisibles. Esta migración se las atribuye
al usuario indicado en la variable de entorno BACKFILL_HISTORY_USER_ID.

**Sin esa variable no hace nada**, que es lo correcto para un despliegue nuevo o
de terceros: no habría a quién atribuirlas y no toca inventarse un dueño.

Cómo obtener el tidal_user_id sin leer ningún token: tras entrar una vez con el
código multiusuario, el id aparece en el **nombre** de la clave de Redis
    valkey-cli KEYS 'user:*:tidal:oauth'   → user:{tidal_user_id}:tidal:oauth

Si se aplica sin la variable y luego se quiere ejecutar el backfill, basta con
    alembic downgrade 003 && BACKFILL_HISTORY_USER_ID=<uid> alembic upgrade head
porque el downgrade es un no-op y el upgrade vuelve a lanzar el UPDATE.

Revision ID: 004
Revises: 003
Create Date: 2026-07-16
"""

import os
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ENV_VAR = "BACKFILL_HISTORY_USER_ID"


def upgrade() -> None:
    user_id = (os.environ.get(_ENV_VAR) or "").strip()
    if not user_id:
        print(f"{_ENV_VAR} no definida: las filas sin dueño se dejan como están.")
        return

    conn = op.get_bind()
    for table, statement in (
        ("downloads", "UPDATE downloads SET user_id = :uid WHERE user_id IS NULL"),
        ("audit_logs", "UPDATE audit_logs SET user_id = :uid WHERE user_id IS NULL"),
    ):
        result = conn.execute(sa.text(statement).bindparams(uid=user_id))
        print(f"{table}: {result.rowcount} filas atribuidas a {user_id}")


def downgrade() -> None:
    """No-op deliberado.

    Tras el backfill, una fila atribuida es indistinguible de una que el usuario
    creó de verdad después. Volver a ponerlas a NULL borraría propiedad legítima,
    así que se prefiere no deshacer nada: el esquema no cambia en esta revisión.
    """
