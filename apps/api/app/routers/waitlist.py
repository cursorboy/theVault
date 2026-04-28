from __future__ import annotations

import re

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import Waitlist

router = APIRouter(prefix="/api/waitlist", tags=["waitlist"])


def _normalize_phone(raw: str) -> str | None:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    if 7 <= len(digits) <= 15:
        return f"+{digits}"
    return None


class JoinBody(BaseModel):
    phone: str = Field(min_length=4, max_length=32)
    name: str | None = Field(default=None, max_length=120)
    source: str | None = Field(default="web", max_length=32)


class JoinResponse(BaseModel):
    ok: bool
    position: int


@router.post("", response_model=JoinResponse)
async def join(
    body: JoinBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user_agent: str = Header(default=""),
):
    phone = _normalize_phone(body.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="invalid phone number")

    existing = await db.execute(select(Waitlist).where(Waitlist.phone == phone))
    row = existing.scalar_one_or_none()

    name = (body.name or "").strip() or None

    if row is None:
        entry = Waitlist(
            phone=phone,
            name=name,
            source=(body.source or "web")[:32],
            referrer=str(request.headers.get("referer") or "")[:500] or None,
            user_agent=user_agent[:500] or None,
        )
        db.add(entry)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
    else:
        # backfill name if user didn't have one before
        if name and not row.name:
            row.name = name
            try:
                await db.commit()
            except Exception:
                await db.rollback()

    pos_result = await db.execute(
        select(func.count()).select_from(Waitlist).where(
            Waitlist.created_at <= (
                row.created_at if row else func.now()
            )
        )
    )
    position = int(pos_result.scalar() or 0)
    if position == 0:
        position = 1

    return JoinResponse(ok=True, position=position)


class CountResponse(BaseModel):
    count: int


@router.get("/count", response_model=CountResponse)
async def count(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.count()).select_from(Waitlist))
    return CountResponse(count=int(result.scalar() or 0))
