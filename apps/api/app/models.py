import uuid
from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, SmallInteger, Text, TIMESTAMP, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(Text, unique=True, nullable=False)
    auth_token = Column(Text, unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    timezone = Column(Text, nullable=False, default="America/New_York")
    digest_enabled = Column(Boolean, default=True)
    digest_day = Column(SmallInteger, default=0)
    digest_hour = Column(SmallInteger, default=9)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    saves = relationship("Save", back_populates="user", cascade="all, delete-orphan")
    clusters = relationship("Cluster", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    digest_logs = relationship("DigestLog", back_populates="user", cascade="all, delete-orphan")


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
    save_id = Column(UUID(as_uuid=True), ForeignKey("saves.id", ondelete="CASCADE"))
    fire_at = Column(TIMESTAMP(timezone=True), nullable=False)
    recur = Column(Text)
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
