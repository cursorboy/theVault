import uuid
from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, SmallInteger, Text, TIMESTAMP, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(Text, unique=True, nullable=True)
    ig_user_id = Column(Text, unique=True, nullable=True)
    ig_username = Column(Text, nullable=True)
    tt_user_id = Column(Text, unique=True, nullable=True)
    tt_username = Column(Text, nullable=True)
    auth_token = Column(Text, unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    timezone = Column(Text, nullable=False, default="America/New_York")
    digest_enabled = Column(Boolean, default=True)
    digest_day = Column(SmallInteger, default=0)
    digest_hour = Column(SmallInteger, default=9)
    profile = Column(JSONB, default=dict)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    saves = relationship("Save", back_populates="user", cascade="all, delete-orphan")
    clusters = relationship("Cluster", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    digest_logs = relationship("DigestLog", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(SmallInteger, autoincrement=True, primary_key=True)
    slug = Column(Text, unique=True, nullable=False)
    label = Column(Text, nullable=False)

    saves = relationship("Save", back_populates="category")


class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    label = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="clusters")
    saves = relationship("Save", back_populates="cluster")


class Save(Base):
    __tablename__ = "saves"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    category_id = Column(SmallInteger, ForeignKey("categories.id"))
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id"))
    platform = Column(Text, nullable=False)
    source_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text)
    duration_secs = Column(Integer)
    title = Column(Text)
    summary = Column(Text)
    transcript = Column(Text)
    tags = Column(ARRAY(Text))
    action_items = Column(ARRAY(Text))
    category_confidence = Column(Float)
    status = Column(Text, nullable=False, default="pending")
    job_id = Column(Text)
    error_msg = Column(Text)
    embedding = Column(Vector(1536))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="saves")
    category = relationship("Category", back_populates="saves")
    cluster = relationship("Cluster", back_populates="saves")
    reminders = relationship("Reminder", back_populates="save", cascade="all, delete-orphan")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    save_id = Column(UUID(as_uuid=True), ForeignKey("saves.id", ondelete="CASCADE"), nullable=True)
    body = Column(Text, nullable=True)  # for save-less reminders ("call mom")
    note = Column(Text, nullable=True)  # extra context AI can attach
    preferred_channel = Column(Text, nullable=True)  # imsg | instagram | tiktok
    fire_at = Column(TIMESTAMP(timezone=True), nullable=False)
    recur = Column(Text)  # daily | weekly | monthly | null
    status = Column(Text, default="pending")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="reminders")
    save = relationship("Save", back_populates="reminders")


class DigestLog(Base):
    __tablename__ = "digest_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    sent_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    save_count = Column(Integer)

    user = relationship("User", back_populates="digest_logs")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(Text, nullable=False)  # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    save_id = Column(UUID(as_uuid=True), ForeignKey("saves.id", ondelete="SET NULL"), nullable=True)
    embedding = Column(Vector(1536))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="conversations")


class Memory(Base):
    __tablename__ = "memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    kind = Column(Text, nullable=False)  # fact | preference | goal | relationship | project | trait
    importance = Column(SmallInteger, default=5)
    embedding = Column(Vector(1536))
    source_conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    source_save_id = Column(UUID(as_uuid=True), ForeignKey("saves.id", ondelete="SET NULL"), nullable=True)
    meta = Column("metadata", JSONB, default=dict)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    last_accessed_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    access_count = Column(Integer, default=0)
    superseded_by = Column(UUID(as_uuid=True), nullable=True)


class PendingLink(Base):
    __tablename__ = "pending_links"

    code = Column(Text, primary_key=True)
    platform = Column(Text, nullable=False, default="instagram")
    external_user_id = Column(Text, nullable=False)
    external_username = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)


class IGProcessedMessage(Base):
    __tablename__ = "ig_processed_messages"

    message_id = Column(Text, primary_key=True)
    processed_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class TTProcessedMessage(Base):
    __tablename__ = "tt_processed_messages"

    message_id = Column(Text, primary_key=True)
    processed_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class Waitlist(Base):
    __tablename__ = "waitlist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(Text, unique=True, nullable=False)
    name = Column(Text, nullable=True)
    source = Column(Text, nullable=True)  # 'web' | 'imsg' | etc
    referrer = Column(Text, nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
