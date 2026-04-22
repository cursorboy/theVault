from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/digest", tags=["digest"])


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


class DigestSettings(BaseModel):
    digest_enabled: bool
    digest_day: int
    digest_hour: int
    timezone: str

    class Config:
        from_attributes = True


class DigestUpdate(BaseModel):
    digest_enabled: Optional[bool] = None
    digest_day: Optional[int] = None
    digest_hour: Optional[int] = None
    timezone: Optional[str] = None


@router.get("", response_model=DigestSettings)
async def get_digest_settings(user: User = Depends(_get_current_user)):
    return user


@router.patch("", response_model=DigestSettings)
async def update_digest_settings(
    body: DigestUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(_get_current_user),
):
    if body.digest_enabled is not None:
        user.digest_enabled = body.digest_enabled
    if body.digest_day is not None:
        user.digest_day = body.digest_day
    if body.digest_hour is not None:
        user.digest_hour = body.digest_hour
    if body.timezone is not None:
        user.timezone = body.timezone
    await db.commit()
    await db.refresh(user)
    return user
