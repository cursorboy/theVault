import logging
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import LoginCode, User
from app.services import sendblue

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class UserResponse(BaseModel):
    id: UUID
    phone: Optional[str] = None
    timezone: str
    digest_enabled: bool
    digest_day: int
    digest_hour: int

    class Config:
        from_attributes = True


@router.get("/verify", response_model=UserResponse)
async def verify_token(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.auth_token == token))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


# ─── phone-code login flow ───────────────────────────────────────────────

CODE_TTL_MIN = 10
CODE_LEN = 6
MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SEC = 60


def _normalize_phone(raw: str) -> Optional[str]:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    if 7 <= len(digits) <= 15:
        return f"+{digits}"
    return None


def _new_code() -> str:
    n = secrets.randbelow(10**CODE_LEN)
    return f"{n:0{CODE_LEN}d}"


class RequestCodeBody(BaseModel):
    phone: str = Field(min_length=4, max_length=32)


class RequestCodeResponse(BaseModel):
    ok: bool
    expires_in_seconds: int


@router.post("/request-code", response_model=RequestCodeResponse)
async def request_code(
    body: RequestCodeBody,
    db: AsyncSession = Depends(get_db),
):
    phone = _normalize_phone(body.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="invalid phone number")

    user = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
    if not user:
        # do not reveal account existence — but we need *some* way to convey "no account"
        # for waitlist UX. Use a 404 so the modal can pivot to "join the waitlist".
        raise HTTPException(status_code=404, detail="no account for that number")

    # cooldown: don't let someone spam codes
    recent = (
        await db.execute(
            select(LoginCode)
            .where(LoginCode.phone == phone)
            .order_by(LoginCode.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if recent and recent.created_at:
        age = (datetime.now(timezone.utc) - recent.created_at).total_seconds()
        if age < RESEND_COOLDOWN_SEC:
            raise HTTPException(status_code=429, detail=f"wait {int(RESEND_COOLDOWN_SEC - age)}s before requesting another code")

    # purge old codes
    await db.execute(delete(LoginCode).where(LoginCode.phone == phone))

    code = _new_code()
    entry = LoginCode(
        phone=phone,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MIN),
    )
    db.add(entry)
    await db.commit()

    try:
        await sendblue.send_message(phone, f"theVault login code, {code}\nexpires in {CODE_TTL_MIN} min. dont share")
    except Exception as e:
        logger.exception("sendblue send_message failed during login: %s", e)
        # Don't leak failure to caller — they'll just not receive the code, can retry after cooldown

    return RequestCodeResponse(ok=True, expires_in_seconds=CODE_TTL_MIN * 60)


class VerifyCodeBody(BaseModel):
    phone: str = Field(min_length=4, max_length=32)
    code: str = Field(min_length=CODE_LEN, max_length=CODE_LEN)


class VerifyCodeResponse(BaseModel):
    ok: bool
    token: str


@router.post("/verify-code", response_model=VerifyCodeResponse)
async def verify_code(
    body: VerifyCodeBody,
    db: AsyncSession = Depends(get_db),
):
    phone = _normalize_phone(body.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="invalid phone number")

    user = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="no account for that number")

    record = (
        await db.execute(
            select(LoginCode)
            .where(LoginCode.phone == phone)
            .order_by(LoginCode.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    if record is None:
        raise HTTPException(status_code=400, detail="no code requested for this number")

    if record.expires_at and record.expires_at < datetime.now(timezone.utc):
        await db.execute(delete(LoginCode).where(LoginCode.id == record.id))
        await db.commit()
        raise HTTPException(status_code=400, detail="code expired, request a new one")

    if (record.attempts or 0) >= MAX_ATTEMPTS:
        await db.execute(delete(LoginCode).where(LoginCode.id == record.id))
        await db.commit()
        raise HTTPException(status_code=400, detail="too many attempts, request a new code")

    if record.code != body.code.strip():
        record.attempts = (record.attempts or 0) + 1
        await db.commit()
        raise HTTPException(status_code=400, detail="wrong code")

    # success — drop the code, return the user's auth_token
    await db.execute(delete(LoginCode).where(LoginCode.phone == phone))
    await db.commit()

    return VerifyCodeResponse(ok=True, token=user.auth_token)
