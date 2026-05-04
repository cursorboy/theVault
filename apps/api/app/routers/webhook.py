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

# TikTok CDN thumbnail hosts — when iMessage strips the share URL, the cover
# image still comes from these CDNs and embeds the video_id in the filename.
TIKTOK_CDN_HOSTS = (
    "tiktokcdn.com",
    "tiktokcdn-us.com",
    "ttwstatic.com",
    "byteoversea.com",
)

# Detects iMessage / Sendblue rich-preview shares of TikTok / Instagram where the
# raw URL has been stripped but brand markers remain in the body.
PREVIEW_PATTERN = re.compile(
    r"(?:\bTikTok\b\s*[·•|-]|\btiktok\.com\b|\binstagram\.com\b|\bReel by\b|\bInstagram\b\s*[·•|-])",
    re.IGNORECASE,
)


def _scan_payload_for_video_url(payload: dict) -> str | None:
    """Walk every string in the Sendblue payload and return the first
    TikTok / Instagram video URL we find. Rich previews often carry the
    real URL in fields outside `content` (link, share_url, attachments[]…)."""
    def _walk(node):
        if isinstance(node, str):
            m = URL_PATTERN.search(node)
            if m:
                return m.group(0)
            return None
        if isinstance(node, dict):
            for v in node.values():
                hit = _walk(v)
                if hit:
                    return hit
        if isinstance(node, list):
            for v in node:
                hit = _walk(v)
                if hit:
                    return hit
        return None
    return _walk(payload)


def _resolve_tiktok_from_thumbnail(image_url: str) -> str | None:
    """When iMessage stripped the share URL but left a TikTok CDN thumbnail,
    try the TikTok oEmbed API + TikTok's image-to-post resolver to recover
    the canonical video URL.

    The thumbnail filename embeds the video_id, e.g.
      https://p16-sign-va.tiktokcdn.com/.../<video_id>~tplv-....jpg
    We pull the longest digit run and probe oEmbed for a matching post."""
    import re as _re
    import httpx

    if not any(h in image_url for h in TIKTOK_CDN_HOSTS):
        return None

    digit_runs = _re.findall(r"\d{15,}", image_url)
    if not digit_runs:
        return None
    video_id = max(digit_runs, key=len)

    candidate = f"https://www.tiktok.com/embed/v2/{video_id}"
    try:
        r = httpx.get(
            "https://www.tiktok.com/oembed",
            params={"url": candidate},
            timeout=8.0,
        )
        if r.status_code == 200:
            data = r.json()
            author = (data.get("author_unique_id") or "").lstrip("@")
            if author:
                return f"https://www.tiktok.com/@{author}/video/{video_id}"
    except Exception:
        logger.exception("tiktok oembed lookup failed")
    return None


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


async def _handle_chat(db: AsyncSession, user: User, message: str, phone: str, image_urls: list[str] | None = None) -> None:
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
            return ai_assistant.chat(sync_db, sync_user, message, image_urls=image_urls, channel="imsg")
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


def _extract_image_urls(payload: dict) -> list[str]:
    """Pull image media URLs from a Sendblue webhook payload. Handles singular/array fields."""
    urls: list[str] = []
    media = payload.get("media_url")
    if isinstance(media, str) and media:
        urls.append(media)
    media_list = payload.get("media_urls")
    if isinstance(media_list, list):
        urls.extend(m for m in media_list if isinstance(m, str) and m)
    # Dedup + filter to likely image types by extension
    seen = set()
    out = []
    for u in urls:
        if u in seen:
            continue
        seen.add(u)
        lower = u.lower().split("?")[0]
        if lower.endswith((".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif")) or "/image" in lower:
            out.append(u)
        else:
            # Unknown type — still include, Claude will reject non-images gracefully
            out.append(u)
    return out


def _looks_like_link_code(text: str) -> bool:
    from app.services.account_linking import looks_like_code
    return looks_like_code(text)


async def _try_consume_link_code(code: str, phone: str) -> bool:
    """Returns True if the code was a valid pending link and got consumed."""
    import asyncio
    from app.database_sync import SyncSessionLocal
    from app.services import account_linking
    from app.services import sendblue

    def _sync_consume():
        db = SyncSessionLocal()
        try:
            return account_linking.consume_code(db, code, phone)
        finally:
            db.close()

    result = await asyncio.to_thread(_sync_consume)
    if not result:
        return False

    platform = result.get("platform", "instagram")
    handle = result.get("external_username") or f"ur {platform[:2]}"
    label = "ig" if platform == "instagram" else "tiktok"
    await sendblue.send_message(phone, f"linked @{handle} ({label}) to ur vault. dm me there or text here, same memory either way")

    # Try to also confirm via the external channel
    try:
        if platform == "instagram":
            from app.services import instagram as ig
            await asyncio.to_thread(
                ig.send_text,
                None,
                result["external_user_id"],
                "linked! u can keep chatting here or thru imsg, same vault either way",
            )
        elif platform == "tiktok":
            # tiktok bot is single-process — push to outbox redis list
            import json as _json
            from redis import Redis
            r = Redis.from_url(settings.redis_url)
            r.rpush("tt:outbox", _json.dumps({
                "tt_user_id": result["external_user_id"],
                "text": "linked! u can keep chatting here or thru imsg, same vault either way",
            }))
    except Exception:
        logger.exception("external-channel confirm send failed")

    return True


async def _process_message_async(
    from_number: str,
    content: str,
    image_urls: list[str] | None = None,
    full_payload: dict | None = None,
):
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

            # 1) raw URL in body = save
            url_match = URL_PATTERN.search(content)
            if url_match:
                await _handle_save_url(db, user, url_match.group(0), from_number)
                return

            # 2) URL hidden in another payload field (rich preview link, attachments…)
            if full_payload:
                hidden = _scan_payload_for_video_url(full_payload)
                if hidden:
                    logger.info("Recovered video URL from payload: %s", hidden)
                    await _handle_save_url(db, user, hidden, from_number)
                    return

            # 3) Rich preview thumbnail from TikTok CDN — resolve via oEmbed
            preview_text = content or ""
            looks_like_preview = bool(PREVIEW_PATTERN.search(preview_text))
            if image_urls:
                for img in image_urls:
                    if any(h in img for h in TIKTOK_CDN_HOSTS):
                        looks_like_preview = True
                        try:
                            resolved = await asyncio.to_thread(
                                _resolve_tiktok_from_thumbnail, img
                            )
                        except Exception:
                            resolved = None
                        if resolved:
                            logger.info("Recovered TikTok URL from thumbnail: %s", resolved)
                            await _handle_save_url(db, user, resolved, from_number)
                            return

            # 4) Couldn't recover the URL — tell the user, don't fall through to chat
            if looks_like_preview:
                platform = "tiktok" if re.search(r"tiktok", preview_text, re.IGNORECASE) or any(
                    "tiktok" in u for u in (image_urls or [])
                ) else "ig reel"
                share_app = "tiktok" if platform == "tiktok" else "ig"
                await sendblue.send_message(
                    from_number,
                    f"got the {platform} preview but imsg ate the actual link. "
                    f"open it in {share_app} → share → copy link → paste it here "
                    f"and ill watch the whole thing",
                )
                return

            # IG link code: 6-char alphanumeric uppercase
            if content and _looks_like_link_code(content):
                handled = await _try_consume_link_code(content, from_number)
                if handled:
                    return

            # If we have neither text nor images, nothing to do
            if not content and not image_urls:
                return

            # Everything else goes to the AI assistant (it has tools for reminders, memory, etc)
            await _handle_chat(db, user, content, from_number, image_urls=image_urls)
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
    image_urls = _extract_image_urls(payload)

    if not from_number:
        return {"ok": True}

    # Return 200 immediately so Sendblue doesn't retry; do all work in background
    background.add_task(_process_message_async, from_number, content, image_urls, payload)
    return {"ok": True}
