import logging
from datetime import datetime, timedelta, timezone

import anthropic
from sqlalchemy.orm import Session
from app.config import settings
from app.models import Category, DigestLog, Save, User
from app.services.sendblue_sync import send_message_sync

logger = logging.getLogger(__name__)


def _should_send_digest(user: User, now: datetime) -> bool:
    """Check if user's digest should fire at this hour."""
    user_tz_offset = 0  # Simplified: use UTC offset logic if needed
    local_now = now  # In production, convert using user.timezone
    return (
        user.digest_enabled
        and local_now.weekday() == user.digest_day
        and local_now.hour == user.digest_hour
    )


def _build_digest_message(saves: list[Save], categories: dict[int, str]) -> str:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    titles = [s.title or "Untitled" for s in saves[:20]]
    summaries = [f"• {t}" for t in titles]

    prompt = (
        f"Write a brief, friendly weekly digest intro (2 sentences max) for {len(saves)} saved videos "
        f"including: {', '.join(titles[:5])}. Be encouraging and highlight variety."
    )
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=100,
        messages=[{"role": "user", "content": prompt}],
    )
    intro = msg.content[0].text.strip()

    lines = [f"Your weekly ReelVault digest ({len(saves)} saves):", "", intro, ""]
    lines.extend(summaries[:10])
    return "\n".join(lines)


def send_weekly_digest_sync(db: Session) -> int:
    """Send weekly digest to all eligible users. Returns count of users sent to."""
    now = datetime.now(timezone.utc)
    users = db.query(User).filter(User.digest_enabled == True).all()
    sent_count = 0

    for user in users:
        if not _should_send_digest(user, now):
            continue

        # Check not already sent this hour
        recent = (
            db.query(DigestLog)
            .filter(
                DigestLog.user_id == user.id,
                DigestLog.sent_at >= now - timedelta(hours=2),
            )
            .first()
        )
        if recent:
            continue

        # Get saves from last 7 days
        week_ago = now - timedelta(days=7)
        saves = (
            db.query(Save)
            .filter(
                Save.user_id == user.id,
                Save.status == "done",
                Save.created_at >= week_ago,
            )
            .order_by(Save.created_at.desc())
            .all()
        )

        if not saves:
            continue

        cat_map = {c.id: c.label for c in db.query(Category).all()}
        try:
            message = _build_digest_message(saves, cat_map)
            send_message_sync(user.phone, message)

            log = DigestLog(user_id=user.id, save_count=len(saves))
            db.add(log)
            db.commit()
            sent_count += 1
        except Exception:
            logger.exception("Digest failed for user %s", user.id)
            db.rollback()

    return sent_count
