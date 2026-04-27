"""instagram bot - account linking + dedup

Revision ID: 004
Revises: 003
Create Date: 2026-04-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("users", "phone", nullable=True)
    op.add_column("users", sa.Column("ig_user_id", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("ig_username", sa.Text(), nullable=True))
    op.create_unique_constraint("users_ig_user_id_key", "users", ["ig_user_id"])

    op.create_table(
        "pending_links",
        sa.Column("code", sa.Text(), primary_key=True),
        sa.Column("ig_user_id", sa.Text(), nullable=False),
        sa.Column("ig_username", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=False),
    )
    op.create_index("pending_links_ig_user_id_idx", "pending_links", ["ig_user_id"])

    op.create_table(
        "ig_processed_messages",
        sa.Column("message_id", sa.Text(), primary_key=True),
        sa.Column("processed_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("ig_processed_messages")
    op.drop_index("pending_links_ig_user_id_idx")
    op.drop_table("pending_links")
    op.drop_constraint("users_ig_user_id_key", "users", type_="unique")
    op.drop_column("users", "ig_username")
    op.drop_column("users", "ig_user_id")
    op.alter_column("users", "phone", nullable=False)
