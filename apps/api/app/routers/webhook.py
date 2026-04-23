from __future__ import annotations

import hashlib
import hmac
import json
import logging
import re
import uuid
from datetime import datetime, timezone

import dateparser
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
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
        await db.commit()
        await db.refresh(user)
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


async def _handle_chat(db: AsyncSession, user: User, message: str, phone: str) -> None:
    """Route conversational messages to the AI assistant (sync, via thread)."""
    import asyncio
    from app.database_sync import SyncSessionLocal
    from app.services import ai_assistant

    def _sync_chat() -> str:
        sync_db = SyncSessionLocal()
        try:
            sync_user = sync_db.get(User, user.id)
            if sync_user is None:
                from sqlalchemy import select as sync_select
                sync_user = sync_db.execute(sync_select(User).where(User.phone == phone)).scalar_one_or_none()
                if sync_user is None:
                    sync_user = User(phone=phone)
                    sync_db.add(sync_user)
                    sync_db.commit()
                    sync_db.refresh(sync_user)
            return ai_assistant.chat(sync_db, sync_user, message)
        finally:
            sync_db.close()

    try:
        reply = await asyncio.to_thread(_sync_chat)
        await sendblue.send_message(phone, reply)
    except Exception as e:
        logger.exception("AI chat failed: %s", e)
        from app.services.ai_assistant import _random_error
        await sendblue.send_message(phone, _random_error())


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


async def _typing_loop(phone: str, stop_event):
    """Keep the typing bubble alive by refreshing every 4 seconds until stop_event is set."""
    import asyncio
    while not stop_event.is_set():
        await sendblue.send_typing_indicator(phone)
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=4.0)
        except asyncio.TimeoutError:
            pass


async def _process_message_async(from_number: str, content: str):
    """Full message processing runs in background so webhook returns immediately."""
    import asyncio
    from app.database import async_session_factory

    # Fire read receipt + typing indicator IMMEDIATELY, in parallel
    await asyncio.gather(
        sendblue.mark_read(from_number),
        sendblue.send_typing_indicator(from_number),
        return_exceptions=True,
    )

    # Start typing refresh loop in background so bubble persists through entire AI call
    stop_typing = asyncio.Event()
    typing_task = asyncio.create_task(_typing_loop(from_number, stop_typing))

    async with async_session_factory() as db:
        try:
            user = await _get_or_create_user(db, from_number)

            # Fast path: raw URL = save
            url_match = URL_PATTERN.search(content)
            if url_match:
                await _handle_save_url(db, user, url_match.group(0), from_number)
                return

            if not content:
                return

            # Everything else goes to the AI assistant (it has tools for reminders, memory, etc)
            await _handle_chat(db, user, content, from_number)
        except Exception:
            logger.exception("Background message processing failed")
        finally:
            stop_typing.set()
            try:
                await asyncio.wait_for(typing_task, timeout=1.0)
            except Exception:
                pass


@router.post("/webhook/sendblue")
async def sendblue_webhook(
    request: Request,
    background: BackgroundTasks,
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

    # Return 200 immediately so Sendblue doesn't retry; do all work in background
    background.add_task(_process_message_async, from_number, content)
    return {"ok": True}
