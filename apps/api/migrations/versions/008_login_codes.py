"""login codes for phone-based dashboard sign-in

Revision ID: 008
Revises: 007
Create Date: 2026-04-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "login_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("attempts", sa.SmallInteger(), server_default=sa.text("0")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("login_codes_phone_idx", "login_codes", ["phone"])


def downgrade() -> None:
    op.drop_index("login_codes_phone_idx", table_name="login_codes")
    op.drop_table("login_codes")
