"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "users",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("phone", sa.Text(), unique=True, nullable=False),
        sa.Column("auth_token", sa.Text(), unique=True, nullable=False, server_default=sa.text("gen_random_uuid()::text")),
        sa.Column("timezone", sa.Text(), nullable=False, server_default="America/New_York"),
        sa.Column("digest_enabled", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("digest_day", sa.SmallInteger(), server_default=sa.text("0")),
        sa.Column("digest_hour", sa.SmallInteger(), server_default=sa.text("9")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "categories",
        sa.Column("id", sa.SmallInteger(), autoincrement=True, primary_key=True),
        sa.Column("slug", sa.Text(), unique=True, nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
    )

    op.create_table(
        "clusters",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("label", sa.Text()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "saves",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("category_id", sa.SmallInteger(), sa.ForeignKey("categories.id")),
        sa.Column("cluster_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("clusters.id")),
        sa.Column("platform", sa.Text(), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("thumbnail_url", sa.Text()),
        sa.Column("duration_secs", sa.Integer()),
        sa.Column("title", sa.Text()),
        sa.Column("summary", sa.Text()),
        sa.Column("transcript", sa.Text()),
        sa.Column("tags", sa.dialects.postgresql.ARRAY(sa.Text())),
        sa.Column("action_items", sa.dialects.postgresql.ARRAY(sa.Text())),
        sa.Column("category_confidence", sa.Float()),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("job_id", sa.Text()),
        sa.Column("error_msg", sa.Text()),
        sa.Column("embedding", Vector(1536)),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )
    op.execute("CREATE INDEX saves_embedding_idx ON saves USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)")

    op.create_table(
        "reminders",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("save_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("saves.id", ondelete="CASCADE")),
        sa.Column("fire_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("recur", sa.Text()),
        sa.Column("status", sa.Text(), server_default="pending"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
    )
    op.execute("CREATE INDEX reminders_fire_at_idx ON reminders (fire_at) WHERE status = 'pending'")

    op.create_table(
        "digest_logs",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("sent_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("save_count", sa.Integer()),
    )

    op.execute("""
        INSERT INTO categories (slug, label) VALUES
        ('professional', 'Professional'),
        ('things-to-do', 'Things To Do'),
        ('places-to-eat', 'Places To Eat'),
        ('coding-projects', 'Coding Projects'),
        ('shopping', 'Shopping'),
        ('fitness', 'Fitness'),
        ('recipes', 'Recipes'),
        ('other', 'Other')
    """)


def downgrade() -> None:
    op.drop_table("digest_logs")
    op.drop_table("reminders")
    op.execute("DROP INDEX IF EXISTS saves_embedding_idx")
    op.drop_table("saves")
    op.drop_table("clusters")
    op.drop_table("categories")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS vector")
