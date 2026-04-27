"""tiktok bot - generalize pending_links to platform-aware + tt user fields

Revision ID: 005
Revises: 004
Create Date: 2026-04-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("tt_user_id", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("tt_username", sa.Text(), nullable=True))
    op.create_unique_constraint("users_tt_user_id_key", "users", ["tt_user_id"])

    op.add_column("pending_links", sa.Column("platform", sa.Text(), nullable=False, server_default="instagram"))
    op.add_column("pending_links", sa.Column("external_user_id", sa.Text(), nullable=True))
    op.add_column("pending_links", sa.Column("external_username", sa.Text(), nullable=True))

    op.execute("UPDATE pending_links SET external_user_id = ig_user_id, external_username = ig_username")
    op.alter_column("pending_links", "external_user_id", nullable=False)

    op.drop_index("pending_links_ig_user_id_idx", table_name="pending_links")
    op.drop_column("pending_links", "ig_user_id")
    op.drop_column("pending_links", "ig_username")

    op.create_index(
        "pending_links_platform_external_idx",
        "pending_links",
        ["platform", "external_user_id"],
    )

    op.create_table(
        "tt_processed_messages",
        sa.Column("message_id", sa.Text(), primary_key=True),
        sa.Column("processed_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    op.drop_table("tt_processed_messages")
    op.drop_index("pending_links_platform_external_idx", table_name="pending_links")

    op.add_column("pending_links", sa.Column("ig_user_id", sa.Text(), nullable=True))
    op.add_column("pending_links", sa.Column("ig_username", sa.Text(), nullable=True))
    op.execute("UPDATE pending_links SET ig_user_id = external_user_id, ig_username = external_username")
    op.alter_column("pending_links", "ig_user_id", nullable=False)
    op.create_index("pending_links_ig_user_id_idx", "pending_links", ["ig_user_id"])

    op.drop_column("pending_links", "external_username")
    op.drop_column("pending_links", "external_user_id")
    op.drop_column("pending_links", "platform")

    op.drop_constraint("users_tt_user_id_key", "users", type_="unique")
    op.drop_column("users", "tt_username")
    op.drop_column("users", "tt_user_id")
