from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.config import settings

sync_engine = create_engine(
    settings.database_sync_url,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
)
SyncSessionLocal = sessionmaker(bind=sync_engine, expire_on_commit=False)


def get_sync_db() -> Session:
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()
