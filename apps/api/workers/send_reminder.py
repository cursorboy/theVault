import logging
import os
import sys
import uuid
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database_sync import SyncSessionLocal
from app.models import Reminder, Save, User
from app.services.sendblue_sync import send_message_sync
from app.config import settings

logger = logging.getLogger(__name__)


def send_reminder(reminder_id: str) -> None:
    db = SyncSessionLocal()
    try:
        reminder = db.get(Reminder, uuid.UUID(reminder_id))
        if not reminder or reminder.status != "pending":
            return

        save = db.get(Save, reminder.save_id)
        user = db.get(User, reminder.user_id)
        if not save or not user:
            reminder.status = "cancelled"
            db.commit()
            return

        dashboard_url = f"{settings.app_url}/save/{save.id}"
        title = save.title or "a saved video"
        summary = save.summary or ""
        msg = f"Reminder: {title}\n{summary[:200] if summary else ''}\n{dashboard_url}".strip()

        send_message_sync(user.phone, msg)
        reminder.status = "sent"

        # Schedule next occurrence for recurring reminders
        if reminder.recur == "daily":
            from app.models import Reminder as ReminderModel
            next_reminder = ReminderModel(
                user_id=reminder.user_id,
                save_id=reminder.save_id,
                fire_at=reminder.fire_at + timedelta(days=1),
                recur="daily",
                status="pending",
            )
            db.add(next_reminder)
        elif reminder.recur == "weekly":
            from app.models import Reminder as ReminderModel
            next_reminder = ReminderModel(
                user_id=reminder.user_id,
                save_id=reminder.save_id,
                fire_at=reminder.fire_at + timedelta(weeks=1),
                recur="weekly",
                status="pending",
            )
            db.add(next_reminder)

        db.commit()
        logger.info("Reminder %s sent to %s", reminder_id, user.phone)

    except Exception:
        logger.exception("send_reminder failed for %s", reminder_id)
        db.rollback()
    finally:
        db.close()
