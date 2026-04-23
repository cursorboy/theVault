import json
import logging
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Optional

import anthropic
from sqlalchemy.orm import Session
from sqlalchemy import desc, select

from app.config import settings
from app.models import Category, Conversation, Save, User

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"
HISTORY_LIMIT = 12
RECENT_SAVES_LIMIT = 20

SYSTEM_PROMPT = """You are Vault, a witty, thoughtful AI assistant that helps users curate and learn from the short-form videos they save. You live inside their iMessage.

Your personality:
- Conversational, warm, and slightly playful — you're texting, not writing essays
- Concise: 1-3 sentences usually, never more than 4
- Opinionated but not preachy
- You know the user — reference their saves and interests naturally
- You ask good follow-up questions when it matters
- Use casual punctuation (lowercase sometimes ok, minimal em-dashes)

Your capabilities:
- You see every video the user saves (with title, summary, tags, category, transcript)
- You build up a profile of their interests over time
- You can search their library when they ask
- You can set reminders, update categories
- You respond to messages naturally — no rigid commands

How to respond:
- When they save a video: react authentically, surface something interesting from it, maybe tie to past saves
- When they ask a question: give a direct answer using their vault as context
- When they chat: be a good conversational partner who remembers them
- When they ask for recommendations: pull from their saved library first

Never: output JSON, use markdown headers, write long paragraphs, be robotic.
"""


def _build_user_context(db: Session, user: User) -> str:
    """Assemble the user context block: profile + recent saves summary."""
    profile = user.profile or {}

    # Recent saves
    recent_saves = (
        db.query(Save)
        .filter(Save.user_id == user.id, Save.status == "done")
        .order_by(desc(Save.created_at))
        .limit(RECENT_SAVES_LIMIT)
        .all()
    )

    # Category stats (all saves)
    cat_map = {c.id: c.label for c in db.query(Category).all()}
    all_saves = db.query(Save).filter(Save.user_id == user.id, Save.status == "done").all()
    cat_counts = Counter(cat_map.get(s.category_id, "Uncategorized") for s in all_saves if s.category_id)
    total = len(all_saves)

    lines = [f"USER CONTEXT (phone: {user.phone}):"]
    lines.append(f"- Total saves: {total}")
    if cat_counts:
        top_cats = ", ".join(f"{label} ({n})" for label, n in cat_counts.most_common(5))
        lines.append(f"- Top categories: {top_cats}")

    if profile.get("interests"):
        lines.append(f"- Learned interests: {', '.join(profile['interests'])}")
    if profile.get("notes"):
        lines.append(f"- Notes about user: {profile['notes']}")

    if recent_saves:
        lines.append("\nRECENT SAVES (newest first):")
        for s in recent_saves[:10]:
            cat = cat_map.get(s.category_id, "?")
            when = s.created_at.strftime("%b %d") if s.created_at else ""
            tags = ", ".join(s.tags[:3]) if s.tags else ""
            lines.append(
                f"- [{when}] \"{s.title or 'Untitled'}\" ({cat}) — {s.summary[:120] if s.summary else ''} [{tags}]"
            )

    return "\n".join(lines)


def _recent_messages(db: Session, user_id) -> list[dict]:
    """Last N messages for conversation history."""
    msgs = (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(desc(Conversation.created_at))
        .limit(HISTORY_LIMIT)
        .all()
    )
    msgs.reverse()
    return [{"role": m.role, "content": m.content} for m in msgs]


def _log_message(db: Session, user_id, role: str, content: str, save_id=None) -> None:
    db.add(Conversation(user_id=user_id, role=role, content=content, save_id=save_id))
    db.commit()


def chat(db: Session, user: User, user_message: str, save_id=None) -> str:
    """Handle a conversational message from the user. Returns the assistant's reply."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Log the user message
    _log_message(db, user.id, "user", user_message, save_id)

    history = _recent_messages(db, user.id)
    context = _build_user_context(db, user)

    system = f"{SYSTEM_PROMPT}\n\n{context}"

    msg = client.messages.create(
        model=MODEL,
        max_tokens=400,
        system=system,
        messages=history or [{"role": "user", "content": user_message}],
    )

    reply = msg.content[0].text.strip()
    _log_message(db, user.id, "assistant", reply)
    return reply


def react_to_save(db: Session, user: User, save: Save) -> str:
    """Generate a personalized reaction to a newly-saved video."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    cat_map = {c.id: c.label for c in db.query(Category).all()}
    category_label = cat_map.get(save.category_id, "Other")
    context = _build_user_context(db, user)

    prompt = f"""The user just saved this video:

Title: {save.title or 'Untitled'}
Category: {category_label}
Summary: {save.summary or '(none)'}
Tags: {', '.join(save.tags) if save.tags else '(none)'}
Action items: {'; '.join(save.action_items) if save.action_items else '(none)'}

React naturally — acknowledge the save in 1-2 sentences, surface the most useful insight or action item, and if relevant tie it to their past saves or ask a quick follow-up. Keep it under 3 sentences. Don't repeat the title verbatim."""

    system = f"{SYSTEM_PROMPT}\n\n{context}"

    msg = client.messages.create(
        model=MODEL,
        max_tokens=250,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )

    reply = msg.content[0].text.strip()
    _log_message(db, user.id, "assistant", reply, save_id=save.id)
    return reply


def update_profile_if_needed(db: Session, user: User) -> None:
    """Periodically have the AI update the user's profile based on saves. Runs every ~10 saves."""
    total = db.query(Save).filter(Save.user_id == user.id, Save.status == "done").count()
    if total == 0 or total % 10 != 0:
        return

    profile = user.profile or {}
    if profile.get("last_updated_at_count") == total:
        return

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    context = _build_user_context(db, user)

    prompt = f"""Based on the user context above, update their profile. Return ONLY valid JSON with this structure:
{{
  "interests": ["specific interest 1", "specific interest 2", ...],
  "notes": "2-3 sentence observational note about this user's patterns, curiosities, or goals"
}}

Be specific. 'Fitness' is weak. 'Marathon training, specifically zone 2 cardio' is strong. Aim for 4-8 interests."""

    msg = client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=context,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        data = json.loads(raw)
        user.profile = {
            **profile,
            "interests": data.get("interests", []),
            "notes": data.get("notes", ""),
            "last_updated_at_count": total,
            "last_updated_at": datetime.now(timezone.utc).isoformat(),
        }
        db.commit()
        logger.info("Updated profile for user %s (at %s saves)", user.id, total)
    except Exception:
        logger.exception("Profile update parse failed")
