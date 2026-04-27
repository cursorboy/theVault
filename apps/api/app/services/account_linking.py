"""IG <-> imsg account linking via 6-char code.

Flow:
- IG user DMs the bot for the first time → generate_code() → bot DMs them the code
- User texts the code from their phone → consume_code() → merges IG-only user
  data into the phone user (or creates linked phone user if none exists)
"""
from __future__ import annotations

import logging
import re
import secrets
import string
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete

from app.models import (
    Cluster,
    Conversation,
    DigestLog,
    Memory,
    PendingLink,
    Reminder,
    Save,
    User,
)

logger = logging.getLogger(__name__)

CODE_RE = re.compile(r"^[A-Z0-9]{6}$")
CODE_TTL_MINUTES = 15
CODE_ALPHABET = string.ascii_uppercase + string.digits


def looks_like_code(text: str) -> bool:
    return bool(CODE_RE.match(text.strip().upper()))


def _new_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))


VALID_PLATFORMS = ("instagram", "tiktok")


def _platform_cols(platform: str) -> tuple[str, str]:
    if platform == "instagram":
        return "ig_user_id", "ig_username"
    if platform == "tiktok":
        return "tt_user_id", "tt_username"
    raise ValueError(f"unknown platform: {platform}")


def generate_code(db: Session, platform: str, external_user_id: str, external_username: str | None) -> str:
    """Create a fresh code for an external (IG/TT) user. Removes any prior unredeemed code."""
    if platform not in VALID_PLATFORMS:
        raise ValueError(f"unknown platform: {platform}")

    db.execute(
        delete(PendingLink).where(
            PendingLink.platform == platform,
            PendingLink.external_user_id == external_user_id,
        )
    )

    for _ in range(10):
        code = _new_code()
        existing = db.execute(select(PendingLink).where(PendingLink.code == code)).scalar_one_or_none()
        if existing:
            continue
        link = PendingLink(
            code=code,
            platform=platform,
            external_user_id=external_user_id,
            external_username=external_username,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES),
        )
        db.add(link)
        db.commit()
        return code
    raise RuntimeError("failed to allocate unique link code")


def consume_code(db: Session, code: str, phone: str) -> dict | None:
    """Redeem a link code. Merges the IG/TT-only user (if any) into the phone user.

    Returns merge summary dict on success, None if code invalid/expired.
    """
    code = code.strip().upper()
    link = db.execute(select(PendingLink).where(PendingLink.code == code)).scalar_one_or_none()
    if not link:
        return None
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        db.execute(delete(PendingLink).where(PendingLink.code == code))
        db.commit()
        return None

    platform = link.platform
    external_user_id = link.external_user_id
    external_username = link.external_username
    id_col, name_col = _platform_cols(platform)

    phone_user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if phone_user is None:
        phone_user = User(phone=phone)
        db.add(phone_user)
        db.flush()

    external_user = db.execute(
        select(User).where(getattr(User, id_col) == external_user_id)
    ).scalar_one_or_none()

    if external_user and external_user.id != phone_user.id:
        for model in (Save, Cluster, Reminder, DigestLog, Conversation, Memory):
            db.execute(
                update(model)
                .where(model.user_id == external_user.id)
                .values(user_id=phone_user.id)
            )
        # Carry over the external_user's other-platform identity if it had one
        for other_id_col, other_name_col in (("ig_user_id", "ig_username"), ("tt_user_id", "tt_username")):
            if other_id_col == id_col:
                continue
            other_id = getattr(external_user, other_id_col, None)
            if other_id and not getattr(phone_user, other_id_col, None):
                setattr(phone_user, other_id_col, other_id)
                setattr(phone_user, other_name_col, getattr(external_user, other_name_col, None))
        db.delete(external_user)

    setattr(phone_user, id_col, external_user_id)
    setattr(phone_user, name_col, external_username)

    db.execute(delete(PendingLink).where(PendingLink.code == code))
    db.commit()

    return {
        "phone": phone,
        "platform": platform,
        "external_user_id": external_user_id,
        "external_username": external_username,
        "merged_existing": bool(external_user),
    }


def get_or_create_external_user(db: Session, platform: str, external_user_id: str, external_username: str | None) -> User:
    id_col, name_col = _platform_cols(platform)
    user = db.execute(select(User).where(getattr(User, id_col) == external_user_id)).scalar_one_or_none()
    if user:
        if external_username and getattr(user, name_col) != external_username:
            setattr(user, name_col, external_username)
            db.commit()
        return user
    user = User(phone=None)
    setattr(user, id_col, external_user_id)
    setattr(user, name_col, external_username)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def is_linked(user: User, platform: str | None = None) -> bool:
    """Linked = has a phone (imsg confirmed). Optionally restrict to a platform."""
    if not user.phone:
        return False
    if platform == "instagram":
        return bool(user.ig_user_id)
    if platform == "tiktok":
        return bool(user.tt_user_id)
    return True
