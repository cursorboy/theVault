from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import Reminder, User
from app.config import settings

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


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


class ReminderCreate(BaseModel):
    save_id: UUID
    fire_at: datetime
    recur: Optional[str] = None


class ReminderResponse(BaseModel):
    id: UUID
    save_id: UUID
    fire_at: datetime
    recur: Optional[str]
    status: str

    class Config:
        from_attributes = True


@router.get("", response_model=list[ReminderResponse])
async def list_reminders(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    result = await db.execute(
        select(Reminder)
        .where(Reminder.user_id == user.id, Reminder.status == "pending")
        .order_by(Reminder.fire_at)
    )
    return result.scalars().all()


@router.post("", response_model=ReminderResponse, status_code=201)
async def create_reminder(
    body: ReminderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    reminder = Reminder(
        user_id=user.id,
        save_id=body.save_id,
        fire_at=body.fire_at,
        recur=body.recur,
        status="pending",
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.delete("/{reminder_id}", status_code=204)
async def cancel_reminder(
    reminder_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    reminder = await db.get(Reminder, reminder_id)
    if not reminder or reminder.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.status = "cancelled"
    await db.commit()
