"""reminders: add body, note, preferred_channel; ensure save_id nullable; monthly recur

Revision ID: 006
Revises: 005
Create Date: 2026-04-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reminders", sa.Column("body", sa.Text(), nullable=True))
    op.add_column("reminders", sa.Column("note", sa.Text(), nullable=True))
    op.add_column("reminders", sa.Column("preferred_channel", sa.Text(), nullable=True))
    op.alter_column("reminders", "save_id", nullable=True)


def downgrade() -> None:
    op.drop_column("reminders", "preferred_channel")
    op.drop_column("reminders", "note")
    op.drop_column("reminders", "body")
