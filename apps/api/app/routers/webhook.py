import hashlib
import hmac
import json
import logging
import re
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models import Save, User
from app.services import sendblue

logger = logging.getLogger(__name__)
router = APIRouter()

URL_PATTERN = re.compile(
    r"https?://(?:www\.)?"
    r"(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com|instagram\.com)"
    r"\S+"
)


def _verify_hmac(body: bytes, signature: str) -> bool:
    expected = hmac.new(
        settings.sendblue_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def _get_or_create_user(db: AsyncSession, phone: str) -> User:
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if not user:
        user = User(phone=phone)
        db.add(user)
        await db.flush()
    return user


@router.post("/webhook/sendblue")
async def sendblue_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_sendblue_signature: str = Header(default=""),
):
    body = await request.body()

    if settings.sendblue_webhook_secret and not _verify_hmac(body, x_sendblue_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = json.loads(body)
    logger.info("Sendblue webhook: %s", payload)

    from_number = payload.get("number") or payload.get("from_number", "")
    content = payload.get("content", "") or ""

    if not from_number:
        return {"ok": True}

    user = await _get_or_create_user(db, from_number)

    # Check for URL
    url_match = URL_PATTERN.search(content)
    if url_match:
        url = url_match.group(0)
        save = Save(
            id=uuid.uuid4(),
            user_id=user.id,
            source_url=url,
            platform="tiktok" if "tiktok" in url else "instagram",
            status="pending",
        )
        db.add(save)
        await db.commit()

        # Enqueue pipeline job
        from redis import Redis
        from rq import Queue
        from workers.process_video import process_video
        conn = Redis.from_url(settings.redis_url)
        q = Queue("default", connection=conn)
        job = q.enqueue(process_video, str(save.id))
        save_obj = await db.get(Save, save.id)
        if save_obj:
            save_obj.job_id = job.id
            await db.commit()

        await sendblue.send_message(from_number, "Got it! Processing...")
        return {"ok": True}

    logger.info("Message from %s (no URL): %s", from_number, content)
    return {"ok": True}
