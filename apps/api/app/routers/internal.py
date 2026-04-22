from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models import Reminder

router = APIRouter(prefix="/internal", tags=["internal"])


def _verify_cron_secret(x_cron_secret: str = Header(default="")) -> None:
    if x_cron_secret != settings.internal_cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/cron/reminders")
async def cron_reminders(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_cron_secret),
):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Reminder).where(
            Reminder.fire_at <= now,
            Reminder.status == "pending",
        )
    )
    due = result.scalars().all()

    from redis import Redis
    from rq import Queue
    from workers.send_reminder import send_reminder
    conn = Redis.from_url(settings.redis_url)
    q = Queue("default", connection=conn)

    enqueued = 0
    for reminder in due:
        q.enqueue(send_reminder, str(reminder.id))
        enqueued += 1

    return {"enqueued": enqueued}
