from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import Category

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryResponse(BaseModel):
    id: int
    slug: str
    label: str

    class Config:
        from_attributes = True


@router.get("", response_model=list[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.id))
    return result.scalars().all()
