from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from uuid import UUID

from app.database import get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class UserResponse(BaseModel):
    id: UUID
    phone: str
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
