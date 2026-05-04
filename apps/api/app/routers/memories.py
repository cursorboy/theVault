from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel

from app.database import get_db
from app.models import Memory, User, Save, Conversation

router = APIRouter(prefix="/api/memories", tags=["memories"])


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


class MemoryResponse(BaseModel):
    id: UUID
    kind: str
    content: str
    importance: int
    created_at: Optional[datetime]
    last_accessed_at: Optional[datetime]
    access_count: int
    source_save_id: Optional[UUID]
    source_conversation_id: Optional[UUID]

    class Config:
        from_attributes = True


class MemoryStatsResponse(BaseModel):
    total_memories: int
    memories_by_kind: dict[str, int]
    saves_count: int
    conversations_count: int
    last_30_days: dict[str, int]


@router.get("", response_model=list[MemoryResponse])
async def list_memories(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
    kind: Optional[str] = Query(default=None),
    limit: int = Query(default=200, le=500),
):
    stmt = (
        select(Memory)
        .where(Memory.user_id == user.id, Memory.superseded_by.is_(None))
        .order_by(desc(Memory.importance), desc(Memory.created_at))
        .limit(limit)
    )
    if kind:
        stmt = stmt.where(Memory.kind == kind)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{memory_id}", status_code=204)
async def forget_memory(
    memory_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    memory = await db.get(Memory, memory_id)
    if not memory or memory.user_id != user.id:
        raise HTTPException(status_code=404, detail="Memory not found")
    await db.delete(memory)
    await db.commit()


@router.get("/stats", response_model=MemoryStatsResponse)
async def memory_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    total = (
        await db.execute(
            select(func.count())
            .select_from(Memory)
            .where(Memory.user_id == user.id, Memory.superseded_by.is_(None))
        )
    ).scalar() or 0

    by_kind_rows = (
        await db.execute(
            select(Memory.kind, func.count())
            .where(Memory.user_id == user.id, Memory.superseded_by.is_(None))
            .group_by(Memory.kind)
        )
    ).all()
    by_kind = {row[0]: int(row[1]) for row in by_kind_rows}

    saves_count = (
        await db.execute(
            select(func.count()).select_from(Save).where(Save.user_id == user.id)
        )
    ).scalar() or 0

    conv_count = (
        await db.execute(
            select(func.count())
            .select_from(Conversation)
            .where(Conversation.user_id == user.id)
        )
    ).scalar() or 0

    from datetime import timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    saves_30 = (
        await db.execute(
            select(func.count())
            .select_from(Save)
            .where(Save.user_id == user.id, Save.created_at >= cutoff)
        )
    ).scalar() or 0

    conv_30 = (
        await db.execute(
            select(func.count())
            .select_from(Conversation)
            .where(Conversation.user_id == user.id, Conversation.created_at >= cutoff)
        )
    ).scalar() or 0

    mem_30 = (
        await db.execute(
            select(func.count())
            .select_from(Memory)
            .where(
                Memory.user_id == user.id,
                Memory.superseded_by.is_(None),
                Memory.created_at >= cutoff,
            )
        )
    ).scalar() or 0

    return MemoryStatsResponse(
        total_memories=int(total),
        memories_by_kind=by_kind,
        saves_count=int(saves_count),
        conversations_count=int(conv_count),
        last_30_days={
            "saves": int(saves_30),
            "conversations": int(conv_30),
            "memories_added": int(mem_30),
        },
    )
