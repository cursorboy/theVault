import json
import logging
import os
import sys
import uuid
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dateutil.relativedelta import relativedelta
from redis import Redis

from app.config import settings
from app.database_sync import SyncSessionLocal
from app.models import Reminder, Save, User
from app.services.sendblue_sync import send_message_sync

logger = logging.getLogger(__name__)


def _voice_sanitize(text: str) -> str:
    from app.services.ai_assistant import _sanitize_voice
    return _sanitize_voice(text)


def _build_message(reminder: Reminder, save: Save | None) -> str:
    if save:
        title = save.title or "ur saved video"
        summary = (save.summary or "").strip()
        url = f"{settings.app_url}/save/{save.id}"
        parts = [f"reminder, {title}"]
        if reminder.note:
            parts.append(reminder.note)
        elif summary:
            parts.append(summary[:160])
        parts.append(url)
        body = "\n".join(parts)
    else:
        body_text = reminder.body or "reminder"
        if reminder.note:
            body = f"reminder, {body_text}\n{reminder.note}"
        else:
            body = f"reminder, {body_text}"
    return _voice_sanitize(body)


def _send_via_imsg(phone: str, msg: str) -> bool:
    try:
        send_message_sync(phone, msg)
        return True
    except Exception:
        logger.exception("imsg send failed for %s", phone)
        return False


def _send_via_ig(redis: Redis, ig_user_id: str, msg: str) -> bool:
    try:
        redis.rpush("ig:outbox", json.dumps({"ig_user_id": ig_user_id, "text": msg}))
        return True
    except Exception:
        logger.exception("ig outbox push failed")
        return False


def _send_via_tt(redis: Redis, tt_user_id: str, msg: str) -> bool:
    try:
        redis.rpush("tt:outbox", json.dumps({"tt_user_id": tt_user_id, "text": msg}))
        return True
    except Exception:
        logger.exception("tt outbox push failed")
        return False


def _deliver(reminder: Reminder, user: User, msg: str, redis: Redis) -> bool:
    """Try preferred channel first, then fall through to whatever the user has."""
    order = []
    if reminder.preferred_channel:
        order.append(reminder.preferred_channel)
    for ch in ("imsg", "instagram", "tiktok"):
        if ch not in order:
            order.append(ch)

    for ch in order:
        if ch == "imsg" and user.phone:
            if _send_via_imsg(user.phone, msg):
                return True
        elif ch == "instagram" and user.ig_user_id:
            if _send_via_ig(redis, user.ig_user_id, msg):
                return True
        elif ch == "tiktok" and user.tt_user_id:
            if _send_via_tt(redis, user.tt_user_id, msg):
                return True
    return False


def _next_recur_at(reminder: Reminder):
    if reminder.recur == "daily":
        return reminder.fire_at + timedelta(days=1)
    if reminder.recur == "weekly":
        return reminder.fire_at + timedelta(weeks=1)
    if reminder.recur == "monthly":
        return reminder.fire_at + relativedelta(months=1)
    return None


def send_reminder(reminder_id: str) -> None:
    db = SyncSessionLocal()
    redis = Redis.from_url(settings.redis_url)
    try:
        reminder = db.get(Reminder, uuid.UUID(reminder_id))
        if not reminder or reminder.status != "pending":
            return

        user = db.get(User, reminder.user_id)
        if not user:
            reminder.status = "cancelled"
            db.commit()
            return

        save = db.get(Save, reminder.save_id) if reminder.save_id else None
        if reminder.save_id and not save:
            # save was deleted; cancel the reminder
            reminder.status = "cancelled"
            db.commit()
            return

        msg = _build_message(reminder, save)
        delivered = _deliver(reminder, user, msg, redis)

        if delivered:
            reminder.status = "sent"
        else:
            reminder.status = "failed"
            logger.error("Reminder %s: no available channel for user %s", reminder_id, user.id)

        next_at = _next_recur_at(reminder)
        if next_at and reminder.status == "sent":
            db.add(Reminder(
                user_id=reminder.user_id,
                save_id=reminder.save_id,
                body=reminder.body,
                note=reminder.note,
                preferred_channel=reminder.preferred_channel,
                fire_at=next_at,
                recur=reminder.recur,
                status="pending",
            ))

        db.commit()
        logger.info("Reminder %s -> status=%s", reminder_id, reminder.status)

    except Exception:
        logger.exception("send_reminder failed for %s", reminder_id)
        db.rollback()
    finally:
        db.close()
