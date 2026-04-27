"""instagrapi adapter — login w/ session reuse, fetch unread DMs, send text, parse shared media.

heavy lib (instagrapi) — never imported at module load. callers must import lazily.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Iterable

from app.config import settings

logger = logging.getLogger(__name__)


def _session_path() -> str:
    os.makedirs(settings.instagram_session_dir, exist_ok=True)
    user = settings.instagram_username or "default"
    return os.path.join(settings.instagram_session_dir, f"{user}.json")


_client_singleton = None


def get_client():
    """Return a logged-in instagrapi Client. Reuses session file across restarts."""
    global _client_singleton
    if _client_singleton is not None:
        return _client_singleton

    from instagrapi import Client

    if not settings.instagram_username or not settings.instagram_password:
        raise RuntimeError("instagram_username/password not set")

    cl = Client()
    cl.delay_range = [1, 3]

    path = _session_path()
    if os.path.exists(path):
        try:
            cl.load_settings(path)
            cl.login(settings.instagram_username, settings.instagram_password)
            cl.get_timeline_feed()
            logger.info("instagram: session restored")
            _client_singleton = cl
            return cl
        except Exception as e:
            logger.warning("instagram: session restore failed (%s), fresh login", e)

    cl = Client()
    cl.delay_range = [1, 3]
    if settings.instagram_verification_code:
        cl.login(
            settings.instagram_username,
            settings.instagram_password,
            verification_code=settings.instagram_verification_code,
        )
    else:
        cl.login(settings.instagram_username, settings.instagram_password)
    cl.dump_settings(path)
    logger.info("instagram: fresh login successful, session saved")
    _client_singleton = cl
    return cl


def send_text(thread_id: str | None, ig_user_id: str, text: str) -> None:
    """Send a DM. Uses thread_id if available, else user_ids."""
    cl = get_client()
    try:
        if thread_id:
            cl.direct_send(text, thread_ids=[thread_id])
        else:
            cl.direct_send(text, user_ids=[int(ig_user_id)])
    except Exception as e:
        logger.exception("instagram send_text failed: %s", e)
        raise


def fetch_unread_threads(limit: int = 20) -> list:
    """Return threads with unread messages."""
    cl = get_client()
    try:
        return cl.direct_threads(amount=limit, selected_filter="unread")
    except Exception as e:
        logger.exception("instagram fetch_unread_threads failed: %s", e)
        return []


def mark_thread_read(thread_id: str) -> None:
    cl = get_client()
    try:
        cl.direct_send_seen(int(thread_id))
    except Exception:
        pass


def extract_message_payload(msg) -> dict:
    """Normalize an instagrapi DirectMessage into our internal shape.

    Returns: {
        "message_id": str,
        "item_type": str,        # 'text' | 'clip' | 'image' | 'reel_share' | 'unknown'
        "text": str | None,
        "url": str | None,       # reconstructed reel/post URL if shared media
        "image_url": str | None, # for visual_media / images
    }
    """
    out = {
        "message_id": str(msg.id),
        "item_type": "unknown",
        "text": None,
        "url": None,
        "image_url": None,
    }

    text = getattr(msg, "text", None)
    item_type = getattr(msg, "item_type", None) or "text"

    if text:
        out["text"] = text
        out["item_type"] = "text"

    clip = getattr(msg, "clip", None)
    if clip is not None:
        out["item_type"] = "clip"
        code = getattr(clip, "code", None) or _nested(clip, "media", "code")
        if code:
            out["url"] = f"https://www.instagram.com/reel/{code}/"

    media_share = getattr(msg, "media_share", None)
    if media_share is not None:
        out["item_type"] = out["item_type"] if out["item_type"] != "unknown" else "media_share"
        code = getattr(media_share, "code", None)
        if code and not out["url"]:
            out["url"] = f"https://www.instagram.com/p/{code}/"

    xma = getattr(msg, "xma_share", None) or getattr(msg, "xma_media_share", None)
    if xma is not None and not out["url"]:
        url = _nested(xma, "video_url") or _nested(xma, "target_url") or _nested(xma, "playable_url")
        if url:
            out["url"] = url
            out["item_type"] = "media_share"

    visual = getattr(msg, "visual_media", None) or getattr(msg, "media", None)
    if visual is not None and out["item_type"] in ("unknown", "text"):
        url = _best_image_url(visual)
        if url:
            out["image_url"] = url
            out["item_type"] = "image"

    if item_type and out["item_type"] == "unknown":
        out["item_type"] = item_type

    return out


def _nested(obj, *keys):
    cur = obj
    for k in keys:
        if cur is None:
            return None
        cur = getattr(cur, k, None) if not isinstance(cur, dict) else cur.get(k)
    return cur


def _best_image_url(visual) -> str | None:
    media = getattr(visual, "media", None) or visual
    versions = getattr(media, "image_versions2", None)
    if versions is None and isinstance(media, dict):
        versions = media.get("image_versions2")
    if versions is None:
        thumb = getattr(media, "thumbnail_url", None) or (media.get("thumbnail_url") if isinstance(media, dict) else None)
        return thumb
    candidates = getattr(versions, "candidates", None) or (versions.get("candidates") if isinstance(versions, dict) else None)
    if not candidates:
        return None
    first = candidates[0]
    return getattr(first, "url", None) or (first.get("url") if isinstance(first, dict) else None)
