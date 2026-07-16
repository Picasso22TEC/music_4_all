"""Add nullable user_id to downloads and audit_logs (multiusuario)

Nullable a propósito: las filas creadas antes del multiusuario no tienen dueño
conocido y no se pueden atribuir a nadie. Se conservan, pero el historial filtra
por user_id, así que ningún usuario las ve (no hay fuga entre cuentas).

Revision ID: 003
Revises: 002
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("downloads", sa.Column("user_id", sa.String(64), nullable=True))
    op.create_index("ix_downloads_user_id", "downloads", ["user_id"])

    op.add_column("audit_logs", sa.Column("user_id", sa.String(64), nullable=True))
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_user_id", "audit_logs")
    op.drop_column("audit_logs", "user_id")
    op.drop_index("ix_downloads_user_id", "downloads")
    op.drop_column("downloads", "user_id")
