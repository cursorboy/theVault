"""TikTok DM listener — long-running playwright-driven process.

Mirrors instagram_bot.py but drives a headless Chromium at tiktok.com/messages.
Polls inbox every N seconds (default 5), routes each new DM through the same
AI pipeline.

Run as its own service alongside the api+worker on Railway. Needs chromium
(install via `playwright install chromium` on the deploy host).
"""
from __future__ import annotations

import json
import logging
import os
import sys
import time
import traceback
import uuid

sys.path.insert(0, os.path.dirname(__file__))

from redis import Redis

from app.config import settings
from app.database_sync import SyncSessionLocal
from app.models import Save, TTProcessedMessage, User
from app.services import account_linking, ai_assistant, tiktok

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("tt_bot")

LINK_INSTRUCTIONS = (
    "hey, first time here. text this code from ur phone to {phone} so i can link "
    "this tiktok to ur vault: {code}\n\n(expires in 15 min)"
)


def _redis() -> Redis:
    return Redis.from_url(settings.redis_url)


def _already_processed(db, message_id: str) -> bool:
    return db.get(TTProcessedMessage, message_id) is not None


def _mark_processed(db, message_id: str) -> None:
    db.add(TTProcessedMessage(message_id=message_id))
    db.commit()


def _enqueue_save(db, user: User, url: str) -> None:
    save = Save(
        id=uuid.uuid4(),
        user_id=user.id,
        source_url=url,
        platform="tiktok",
        status="pending",
    )
    db.add(save)
    db.commit()

    from rq import Queue
    from workers.process_video import process_video
    q = Queue("default", connection=_redis())
    job = q.enqueue(process_video, str(save.id))

    save_obj = db.get(Save, save.id)
    if save_obj:
        save_obj.job_id = job.id
        db.commit()


def _send_link_instructions(thread: dict, tt_user_id: str, tt_username: str | None) -> None:
    db = SyncSessionLocal()
    try:
        code = account_linking.generate_code(db, "tiktok", tt_user_id, tt_username)
    finally:
        db.close()
    msg = LINK_INSTRUCTIONS.format(phone=settings.sendblue_from_number, code=code)
    tiktok.send_text(thread, tt_user_id, msg)


def _process_thread(thread: dict) -> None:
    if not thread.get("unread"):
        return

    msgs = tiktok.open_thread_and_extract_messages(thread, max_msgs=10)
    if not msgs:
        return

    sender_id = tiktok.thread_user_id(thread) or thread.get("username") or ""
    if not sender_id:
        return
    sender_username = thread.get("username")

    db = SyncSessionLocal()
    try:
        tt_user = account_linking.get_or_create_external_user(db, "tiktok", sender_id, sender_username)
        linked = account_linking.is_linked(tt_user, "tiktok")

        for msg in msgs:
            if msg.get("from_me"):
                continue
            mid = msg.get("message_id")
            if not mid or _already_processed(db, mid):
                continue

            if not linked:
                _send_link_instructions(thread, sender_id, sender_username)
                _mark_processed(db, mid)
                continue

            video_url = msg.get("video_url")
            text = msg.get("text") or ""
            image_url = msg.get("image_url")

            if video_url:
                _enqueue_save(db, tt_user, video_url)
                tiktok.send_text(thread, sender_id, "got it, processing")
                _mark_processed(db, mid)
                continue

            if not text and not image_url:
                _mark_processed(db, mid)
                continue

            image_urls = [image_url] if image_url else None
            try:
                reply = ai_assistant.chat(db, tt_user, text or "", image_urls=image_urls, channel="tiktok")
            except Exception:
                logger.exception("ai chat failed")
                from app.services.ai_assistant import _random_error
                reply = _random_error()

            tiktok.send_text(thread, sender_id, reply)
            _mark_processed(db, mid)
    finally:
        db.close()


def _poll_inbox() -> None:
    try:
        threads = tiktok.fetch_inbox_threads(limit=20)
    except Exception:
        logger.exception("fetch_inbox_threads failed")
        return

    for thread in threads:
        try:
            _process_thread(thread)
        except Exception:
            logger.exception("thread processing failed")


def _drain_outbox(redis: Redis) -> None:
    """Drain tt:outbox redis list. Each entry: {tt_user_id, text}."""
    while True:
        raw = redis.lpop("tt:outbox")
        if not raw:
            return
        try:
            payload = json.loads(raw)
            tiktok.send_text(None, payload["tt_user_id"], payload["text"])
        except Exception:
            logger.exception("outbox send failed: %s", raw)


def main() -> None:
    if not settings.tiktok_username or not settings.tiktok_password:
        logger.error("TIKTOK_USERNAME/PASSWORD not set, exiting")
        return

    logger.info("tt_bot starting (poll=%ss, headless=%s)", settings.tiktok_poll_seconds, settings.tiktok_headless)
    try:
        tiktok.get_page()
    except Exception:
        logger.exception("initial login failed; will retry in loop")

    redis = _redis()
    interval = max(1, int(settings.tiktok_poll_seconds))

    try:
        while True:
            try:
                _drain_outbox(redis)
                _poll_inbox()
            except Exception:
                logger.exception("loop iteration failed: %s", traceback.format_exc())
            time.sleep(interval)
    finally:
        tiktok.shutdown()


if __name__ == "__main__":
    main()
