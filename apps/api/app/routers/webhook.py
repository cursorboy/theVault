import hashlib
import hmac
import json
import logging
import re
import uuid
from datetime import datetime, timezone

import dateparser
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.config import settings
from app.database import get_db
from app.models import Reminder, Save, User
from app.services import sendblue, bot_parser

logger = logging.getLogger(__name__)
router = APIRouter()

URL_PATTERN = re.compile(
    r"https?://(?:www\.)?"
    r"(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com|instagram\.com)"
    r"\S+"
)

CATEGORY_SLUGS = {
    "professional", "things-to-do", "places-to-eat", "coding-projects",
    "shopping", "fitness", "recipes", "other",
}


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


async def _get_last_save(db: AsyncSession, user_id) -> Save | None:
    result = await db.execute(
        select(Save)
        .where(Save.user_id == user_id)
        .order_by(desc(Save.created_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _handle_save_url(db: AsyncSession, user: User, url: str, phone: str) -> None:
    save = Save(
        id=uuid.uuid4(),
        user_id=user.id,
        source_url=url,
        platform="tiktok" if "tiktok" in url else "instagram",
        status="pending",
    )
    db.add(save)
    await db.commit()

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

    await sendblue.send_message(phone, "Got it! Processing...")


async def _handle_remind_me(db: AsyncSession, user: User, time_str: str, phone: str) -> None:
    last_save = await _get_last_save(db, user.id)
    if not last_save:
        await sendblue.send_message(phone, "You don't have any saved videos yet!")
        return

    fire_at = dateparser.parse(time_str, settings={"RETURN_AS_TIMEZONE_AWARE": True})
    if not fire_at:
        await sendblue.send_message(phone, "I didn't understand that time. Try 'remind me tomorrow at 9am'.")
        return

    reminder = Reminder(
        user_id=user.id,
        save_id=last_save.id,
        fire_at=fire_at,
        status="pending",
    )
    db.add(reminder)
    await db.commit()

    fire_str = fire_at.strftime("%B %d at %I:%M %p")
    await sendblue.send_message(phone, f"Reminder set for {fire_str}: {last_save.title or 'your last save'}")


async def _handle_query_saves(db: AsyncSession, user: User, query: str, phone: str) -> None:
    from app.services.embedder import embed_text
    from sqlalchemy import text

    embedding = embed_text(query)
    result = await db.execute(
        text("""
            SELECT id, title, summary, source_url,
                   (embedding <=> CAST(:emb AS vector)) AS distance
            FROM saves
            WHERE user_id = :uid AND status = 'done' AND embedding IS NOT NULL
            ORDER BY distance ASC
            LIMIT 3
        """),
        {"emb": json.dumps(embedding), "uid": str(user.id)},
    )
    rows = result.fetchall()

    if not rows:
        await sendblue.send_message(phone, "No saved videos found matching that search.")
        return

    lines = [f"Top results for '{query}':"]
    for row in rows:
        url = f"{settings.app_url}/save/{row.id}"
        lines.append(f"• {row.title or 'Untitled'} — {url}")

    await sendblue.send_message(phone, "\n".join(lines))


async def _handle_category_override(db: AsyncSession, user: User, category_slug: str, phone: str) -> None:
    last_save = await _get_last_save(db, user.id)
    if not last_save:
        await sendblue.send_message(phone, "No saved videos to update.")
        return

    from app.models import Category
    cat = await db.execute(select(Category).where(Category.slug == category_slug))
    cat = cat.scalar_one_or_none()
    if not cat:
        await sendblue.send_message(phone, f"Unknown category: {category_slug}")
        return

    last_save.category_id = cat.id
    await db.commit()
    await sendblue.send_message(phone, f"Updated category to {cat.label}.")


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
    content = (payload.get("content") or "").strip()

    if not from_number:
        return {"ok": True}

    user = await _get_or_create_user(db, from_number)

    # Fast path: raw URL detected before calling Claude
    url_match = URL_PATTERN.search(content)
    if url_match:
        await _handle_save_url(db, user, url_match.group(0), from_number)
        return {"ok": True}

    if not content:
        return {"ok": True}

    # Get last save context for Claude
    last_save = await _get_last_save(db, user.id)
    parsed = bot_parser.parse_message(
        message_text=content,
        last_save_title=last_save.title or "" if last_save else "",
        last_save_id=str(last_save.id) if last_save else "",
    )

    if parsed.intent == "save_url" and parsed.url:
        await _handle_save_url(db, user, parsed.url, from_number)
    elif parsed.intent == "remind_me" and parsed.time_str:
        await _handle_remind_me(db, user, parsed.time_str, from_number)
    elif parsed.intent == "query_saves" and parsed.query:
        await _handle_query_saves(db, user, parsed.query, from_number)
    elif parsed.intent == "category_override" and parsed.category_slug:
        await _handle_category_override(db, user, parsed.category_slug, from_number)
    else:
        logger.info("Unhandled intent %s from %s: %s", parsed.intent, from_number, content)

    return {"ok": True}
