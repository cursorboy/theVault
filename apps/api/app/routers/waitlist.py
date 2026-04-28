import re
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models import Waitlist

router = APIRouter(prefix="/api/waitlist", tags=["waitlist"])


def _normalize_phone(raw: str) -> Optional[str]:
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
    name: Optional[str] = Field(default=None, max_length=120)
    source: Optional[str] = Field(default="web", max_length=32)


class JoinResponse(BaseModel):
    ok: bool
    position: int
    already_on_list: bool
    joined_at: Optional[str] = None


def _looks_garbage(phone_e164: str) -> bool:
    """Reject obvious fakes: all-same digit (e.g. +11111111111), sequential, too short post-normalize."""
    digits = re.sub(r"\D", "", phone_e164)
    if len(digits) < 10:
        return True
    # the local part (last 10 digits) shouldn't be all the same digit
    local = digits[-10:]
    if len(set(local)) == 1:
        return True
    # NXX (area code) can't start with 0 or 1 in NANP
    if digits.startswith("1") and local[0] in "01":
        return True
    return False


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
    if _looks_garbage(phone):
        raise HTTPException(status_code=400, detail="that doesn't look like a real number")

    existing = await db.execute(select(Waitlist).where(Waitlist.phone == phone))
    row = existing.scalar_one_or_none()

    name = (body.name or "").strip() or None
    already_on_list = row is not None

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
            await db.refresh(entry)
            row = entry
        except IntegrityError:
            # raced with another request — fetch the winning row instead
            await db.rollback()
            existing = await db.execute(select(Waitlist).where(Waitlist.phone == phone))
            row = existing.scalar_one_or_none()
            already_on_list = True
    else:
        # backfill name once if we didn't have it before, but don't overwrite an existing name
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

    joined_iso = row.created_at.isoformat() if row and row.created_at else None
    return JoinResponse(
        ok=True,
        position=position,
        already_on_list=already_on_list,
        joined_at=joined_iso,
    )


class CountResponse(BaseModel):
    count: int


@router.get("/count", response_model=CountResponse)
async def count(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.count()).select_from(Waitlist))
    return CountResponse(count=int(result.scalar() or 0))
