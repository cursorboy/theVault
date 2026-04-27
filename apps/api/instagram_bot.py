"""Instagram DM listener — long-running process.

Polls IG inbox every N seconds (default 5), routes each new DM through the same
AI pipeline used for iMessage:
  - URL (reel/post) -> save (enqueue process_video)
  - text from unlinked IG user -> generate link code, DM it back
  - text from linked IG user -> ai_assistant.chat
  - image -> ai_assistant.chat with image_urls
  - shared reel/clip -> save (using reconstructed URL)

Also drains a redis list `ig:outbox` for outbound messages enqueued from the
API server (e.g. confirmation pings after imsg-side linking).

Run as its own service alongside the api+worker on Railway.
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
from app.models import IGProcessedMessage, Save, User
from app.services import account_linking, ai_assistant, instagram

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ig_bot")

URL_PATTERN_TEXT = __import__("re").compile(
    r"https?://(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com|instagram\.com)\S+"
)

LINK_INSTRUCTIONS = (
    "hey, first time here. text this code from ur phone to {phone} so i can link "
    "this ig to ur vault: {code}\n\n(expires in 15 min)"
)


def _redis() -> Redis:
    return Redis.from_url(settings.redis_url)


def _already_processed(db, message_id: str) -> bool:
    return db.get(IGProcessedMessage, message_id) is not None


def _mark_processed(db, message_id: str) -> None:
    db.add(IGProcessedMessage(message_id=message_id))
    db.commit()


def _enqueue_save(db, user: User, url: str) -> None:
    save = Save(
        id=uuid.uuid4(),
        user_id=user.id,
        source_url=url,
        platform="tiktok" if "tiktok" in url else "instagram",
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


def _send_link_instructions(thread_id: str | None, ig_user_id: str, ig_username: str | None) -> None:
    db = SyncSessionLocal()
    try:
        code = account_linking.generate_code(db, "instagram", ig_user_id, ig_username)
    finally:
        db.close()
    msg = LINK_INSTRUCTIONS.format(phone=settings.sendblue_from_number, code=code)
    instagram.send_text(thread_id, ig_user_id, msg)


def _process_message(thread, msg) -> None:
    """Route a single DM."""
    payload = instagram.extract_message_payload(msg)
    message_id = payload["message_id"]

    db = SyncSessionLocal()
    try:
        if _already_processed(db, message_id):
            return

        sender_id = str(getattr(msg, "user_id", "") or "")
        if not sender_id:
            _mark_processed(db, message_id)
            return

        # Skip messages from self (bot's own outbound)
        cl = instagram.get_client()
        if str(cl.user_id) == sender_id:
            _mark_processed(db, message_id)
            return

        ig_username = None
        for u in getattr(thread, "users", []) or []:
            if str(getattr(u, "pk", "")) == sender_id:
                ig_username = getattr(u, "username", None)
                break

        ig_user = account_linking.get_or_create_external_user(db, "instagram", sender_id, ig_username)
        thread_id = str(getattr(thread, "id", "") or "")

        # If unlinked, only respond with linking flow (one-time per ig account)
        if not account_linking.is_linked(ig_user, "instagram"):
            _send_link_instructions(thread_id, sender_id, ig_username)
            _mark_processed(db, message_id)
            return

        # Linked user — full pipeline
        url = payload.get("url")
        text = payload.get("text") or ""
        image_url = payload.get("image_url")

        if not url and text:
            m = URL_PATTERN_TEXT.search(text)
            if m:
                url = m.group(0)

        if url:
            _enqueue_save(db, ig_user, url)
            instagram.send_text(thread_id, sender_id, "got it, processing")
            _mark_processed(db, message_id)
            return

        if not text and not image_url:
            _mark_processed(db, message_id)
            return

        image_urls = [image_url] if image_url else None
        try:
            reply = ai_assistant.chat(db, ig_user, text or "", image_urls=image_urls, channel="instagram")
        except Exception:
            logger.exception("ai chat failed")
            from app.services.ai_assistant import _random_error
            reply = _random_error()

        instagram.send_text(thread_id, sender_id, reply)
        _mark_processed(db, message_id)
    finally:
        db.close()


def _poll_inbox() -> None:
    try:
        threads = instagram.fetch_unread_threads(limit=20)
    except Exception:
        logger.exception("fetch_unread_threads failed")
        return

    for thread in threads:
        try:
            messages = getattr(thread, "messages", []) or []
            for msg in reversed(messages):
                _process_message(thread, msg)
            tid = getattr(thread, "id", None)
            if tid:
                instagram.mark_thread_read(str(tid))
        except Exception:
            logger.exception("thread processing failed")


def _drain_outbox(redis: Redis) -> None:
    """Drain ig:outbox redis list. Each entry is JSON: {ig_user_id, text, thread_id?}."""
    while True:
        raw = redis.lpop("ig:outbox")
        if not raw:
            return
        try:
            payload = json.loads(raw)
            instagram.send_text(
                payload.get("thread_id"),
                payload["ig_user_id"],
                payload["text"],
            )
        except Exception:
            logger.exception("outbox send failed: %s", raw)


def main() -> None:
    if not settings.instagram_username or not settings.instagram_password:
        logger.error("INSTAGRAM_USERNAME/PASSWORD not set, exiting")
        return

    logger.info("ig_bot starting (poll=%ss)", settings.instagram_poll_seconds)
    try:
        instagram.get_client()
    except Exception:
        logger.exception("initial login failed; will retry in loop")

    redis = _redis()
    interval = max(1, int(settings.instagram_poll_seconds))

    while True:
        try:
            _drain_outbox(redis)
            _poll_inbox()
        except Exception:
            logger.exception("loop iteration failed: %s", traceback.format_exc())
        time.sleep(interval)


if __name__ == "__main__":
    main()
