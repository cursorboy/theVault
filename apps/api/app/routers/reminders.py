from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.database import get_db
from app.models import Reminder, Save, User

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
    save_id: Optional[UUID] = None
    body: Optional[str] = None
    note: Optional[str] = None
    fire_at: datetime
    recur: Optional[str] = None


class ReminderUpdate(BaseModel):
    fire_at: Optional[datetime] = None
    body: Optional[str] = None
    note: Optional[str] = None
    recur: Optional[str] = None
    status: Optional[str] = None


class ReminderResponse(BaseModel):
    id: UUID
    save_id: Optional[UUID]
    body: Optional[str]
    note: Optional[str]
    fire_at: datetime
    recur: Optional[str]
    status: str
    save_title: Optional[str] = None

    class Config:
        from_attributes = True


def _to_response(r: Reminder, save_title: Optional[str] = None) -> ReminderResponse:
    return ReminderResponse(
        id=r.id,
        save_id=r.save_id,
        body=r.body,
        note=r.note,
        fire_at=r.fire_at,
        recur=r.recur,
        status=r.status,
        save_title=save_title,
    )


@router.get("", response_model=list[ReminderResponse])
async def list_reminders(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
    status: Optional[str] = "pending",
):
    stmt = select(Reminder).where(Reminder.user_id == user.id)
    if status:
        stmt = stmt.where(Reminder.status == status)
    stmt = stmt.order_by(Reminder.fire_at)
    rems = (await db.execute(stmt)).scalars().all()

    save_ids = [r.save_id for r in rems if r.save_id]
    titles: dict[UUID, str] = {}
    if save_ids:
        rows = (
            await db.execute(select(Save.id, Save.title).where(Save.id.in_(save_ids)))
        ).all()
        titles = {row[0]: row[1] for row in rows}

    return [_to_response(r, titles.get(r.save_id)) for r in rems]


@router.get("/recent", response_model=list[ReminderResponse])
async def recent_completed(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
    limit: int = 20,
):
    stmt = (
        select(Reminder)
        .where(Reminder.user_id == user.id, Reminder.status.in_(["sent", "completed", "cancelled"]))
        .order_by(desc(Reminder.fire_at))
        .limit(limit)
    )
    rems = (await db.execute(stmt)).scalars().all()
    save_ids = [r.save_id for r in rems if r.save_id]
    titles: dict[UUID, str] = {}
    if save_ids:
        rows = (
            await db.execute(select(Save.id, Save.title).where(Save.id.in_(save_ids)))
        ).all()
        titles = {row[0]: row[1] for row in rows}
    return [_to_response(r, titles.get(r.save_id)) for r in rems]


@router.post("", response_model=ReminderResponse, status_code=201)
async def create_reminder(
    body: ReminderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    if not body.save_id and not (body.body and body.body.strip()):
        raise HTTPException(status_code=400, detail="need either save_id or body")

    reminder = Reminder(
        user_id=user.id,
        save_id=body.save_id,
        body=(body.body or "").strip() or None,
        note=(body.note or "").strip() or None,
        fire_at=body.fire_at,
        recur=body.recur,
        status="pending",
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return _to_response(reminder)


@router.patch("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: UUID,
    body: ReminderUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    reminder = await db.get(Reminder, reminder_id)
    if not reminder or reminder.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if body.fire_at is not None:
        reminder.fire_at = body.fire_at
    if body.body is not None:
        reminder.body = body.body or None
    if body.note is not None:
        reminder.note = body.note or None
    if body.recur is not None:
        reminder.recur = body.recur or None
    if body.status is not None:
        reminder.status = body.status
    await db.commit()
    await db.refresh(reminder)
    return _to_response(reminder)


@router.post("/{reminder_id}/snooze", response_model=ReminderResponse)
async def snooze_reminder(
    reminder_id: UUID,
    minutes: int = 60,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    reminder = await db.get(Reminder, reminder_id)
    if not reminder or reminder.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.fire_at = reminder.fire_at + timedelta(minutes=max(5, minutes))
    reminder.status = "pending"
    await db.commit()
    await db.refresh(reminder)
    return _to_response(reminder)


@router.post("/{reminder_id}/done", response_model=ReminderResponse)
async def mark_done(
    reminder_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    reminder = await db.get(Reminder, reminder_id)
    if not reminder or reminder.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.status = "completed"
    await db.commit()
    await db.refresh(reminder)
    return _to_response(reminder)


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
