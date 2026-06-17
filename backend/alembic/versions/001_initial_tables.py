"""Initial tables: downloads and audit_logs

Revision ID: 001
Revises:
Create Date: 2026-05-31
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "downloads",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("artist", sa.String(500), nullable=False),
        sa.Column("quality", sa.String(100), nullable=False),
        sa.Column("cover_url", sa.Text, nullable=True),
        sa.Column("job_id", sa.String(36), nullable=True),
        sa.Column(
            "downloaded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_downloads_downloaded_at", "downloads", ["downloaded_at"])
    op.create_index("ix_downloads_job_id", "downloads", ["job_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event", sa.String(100), nullable=False),
        sa.Column("detail", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_audit_logs_event", "audit_logs", ["event"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_created_at", "audit_logs")
    op.drop_index("ix_audit_logs_event", "audit_logs")
    op.drop_table("audit_logs")
    op.drop_index("ix_downloads_job_id", "downloads")
    op.drop_index("ix_downloads_downloaded_at", "downloads")
    op.drop_table("downloads")
