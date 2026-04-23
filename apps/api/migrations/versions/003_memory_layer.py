"""deep memory layer - episodic + semantic memories

Revision ID: 003
Revises: 002
Create Date: 2024-01-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from pgvector.sqlalchemy import Vector

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add embeddings to conversations for episodic recall
    op.add_column("conversations", sa.Column("embedding", Vector(1536), nullable=True))
    op.execute(
        "CREATE INDEX conversations_embedding_idx ON conversations "
        "USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50)"
    )

    # Semantic memories: extracted facts about the user
    op.create_table(
        "memories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),  # fact | preference | goal | relationship | project | trait
        sa.Column("importance", sa.SmallInteger(), server_default=sa.text("5")),  # 1-10
        sa.Column("embedding", Vector(1536)),
        sa.Column("source_conversation_id", UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source_save_id", UUID(as_uuid=True), sa.ForeignKey("saves.id", ondelete="SET NULL"), nullable=True),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("last_accessed_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("access_count", sa.Integer(), server_default=sa.text("0")),
        sa.Column("superseded_by", UUID(as_uuid=True), nullable=True),  # self-referential; for consolidation
    )
    op.execute(
        "CREATE INDEX memories_embedding_idx ON memories "
        "USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50)"
    )
    op.create_index("memories_user_kind_idx", "memories", ["user_id", "kind"])
    op.create_index("memories_active_idx", "memories", ["user_id"], postgresql_where=sa.text("superseded_by IS NULL"))


def downgrade() -> None:
    op.drop_index("memories_active_idx")
    op.drop_index("memories_user_kind_idx")
    op.execute("DROP INDEX IF EXISTS memories_embedding_idx")
    op.drop_table("memories")
    op.execute("DROP INDEX IF EXISTS conversations_embedding_idx")
    op.drop_column("conversations", "embedding")
