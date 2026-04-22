import json
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, text
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Save, User

router = APIRouter(prefix="/api/saves", tags=["saves"])


async def _get_current_user(
    db: AsyncSession = Depends(get_db),
    authorization: str = Header(default=""),
) -> User:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    result = await db.execute(select(User).where(User.auth_token == token))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


class SaveResponse(BaseModel):
    id: UUID
    platform: str
    source_url: str
    thumbnail_url: Optional[str]
    duration_secs: Optional[int]
    title: Optional[str]
    summary: Optional[str]
    tags: Optional[list[str]]
    action_items: Optional[list[str]]
    category_id: Optional[int]
    cluster_id: Optional[UUID]
    status: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.get("", response_model=list[SaveResponse])
async def list_saves(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
    category_id: Optional[int] = Query(default=None),
    cluster_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
):
    stmt = (
        select(Save)
        .where(Save.user_id == user.id)
        .order_by(desc(Save.created_at))
        .limit(limit)
        .offset(offset)
    )
    if category_id is not None:
        stmt = stmt.where(Save.category_id == category_id)
    if cluster_id is not None:
        stmt = stmt.where(Save.cluster_id == cluster_id)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/search", response_model=list[SaveResponse])
async def search_saves(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
    limit: int = Query(default=10, le=50),
):
    from app.services.embedder import embed_text
    embedding = embed_text(q)

    result = await db.execute(
        text("""
            SELECT id, platform, source_url, thumbnail_url, duration_secs,
                   title, summary, tags, action_items, category_id, cluster_id,
                   status, created_at
            FROM saves
            WHERE user_id = :uid AND status = 'done' AND embedding IS NOT NULL
            ORDER BY (embedding <=> CAST(:emb AS vector)) ASC
            LIMIT :lim
        """),
        {"emb": json.dumps(embedding), "uid": str(user.id), "lim": limit},
    )
    rows = result.mappings().all()
    return [SaveResponse(**dict(row)) for row in rows]


@router.get("/{save_id}", response_model=SaveResponse)
async def get_save(
    save_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    save = await db.get(Save, save_id)
    if not save or save.user_id != user.id:
        raise HTTPException(status_code=404, detail="Save not found")
    return save


@router.delete("/{save_id}", status_code=204)
async def delete_save(
    save_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    save = await db.get(Save, save_id)
    if not save or save.user_id != user.id:
        raise HTTPException(status_code=404, detail="Save not found")
    await db.delete(save)
    await db.commit()
