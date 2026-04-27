"""TikTok DM adapter via Playwright.

No instagrapi-equivalent for tiktok DMs exists in 2026. We drive a real
browser at tiktok.com/messages, scrape the inbox, send replies via the
textarea+send-button. Persistent chrome profile keeps the session alive
across restarts (cookies, localStorage).

Selectors based on tiktok.com/messages DOM (April 2026):
  - inbox items:    [data-e2e="chat-list-item"]
  - chat container: [data-e2e="message-list"]
  - text input:     div[contenteditable="true"][role="textbox"][aria-label*="Send a message"]
  - send button:    button[data-e2e="message-send-button"], fallback to .StyledSendButton
  - shared video:   anchor href matching /@[^/]+/video/\\d+

These selectors will rot. Update here when they break.

This module is heavyweight (chromium). Never imported at module load — callers
must import lazily.
"""
from __future__ import annotations

import logging
import os
import re
import time
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

VIDEO_HREF_RE = re.compile(r"https?://(?:www\.)?tiktok\.com/@[^/\s\"']+/video/\d+")

INBOX_URL = "https://www.tiktok.com/messages?lang=en"
LOGIN_URL = "https://www.tiktok.com/login/phone-or-email/email"

INBOX_ITEM_SEL = '[data-e2e="chat-list-item"]'
MESSAGE_LIST_SEL = '[data-e2e="message-list"]'
MESSAGE_ITEM_SEL = '[data-e2e="chat-item"]'
INPUT_SEL = 'div[contenteditable="true"][role="textbox"]'
SEND_BTN_SEL = 'button[data-e2e="message-send-button"], button[class*="StyledSendButton"]'

_browser_state: dict[str, Any] = {"playwright": None, "context": None, "page": None}


def _ensure_profile_dir() -> str:
    os.makedirs(settings.tiktok_profile_dir, exist_ok=True)
    return settings.tiktok_profile_dir


def get_page():
    """Return a Playwright Page logged into tiktok.com. Reuses across calls."""
    if _browser_state["page"] is not None:
        return _browser_state["page"]

    from playwright.sync_api import sync_playwright

    pw = sync_playwright().start()
    profile = _ensure_profile_dir()

    launch_kwargs = {
        "user_data_dir": profile,
        "headless": settings.tiktok_headless,
        "args": [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ],
    }
    if settings.tiktok_proxy:
        launch_kwargs["proxy"] = {"server": settings.tiktok_proxy}

    context = pw.chromium.launch_persistent_context(**launch_kwargs)
    page = context.pages[0] if context.pages else context.new_page()

    page.set_default_timeout(15000)

    page.goto(INBOX_URL, wait_until="domcontentloaded")
    if "/login" in page.url:
        _login(page)
        page.goto(INBOX_URL, wait_until="domcontentloaded")

    page.wait_for_selector(INBOX_ITEM_SEL, timeout=20000)

    _browser_state["playwright"] = pw
    _browser_state["context"] = context
    _browser_state["page"] = page
    logger.info("tiktok: page ready")
    return page


def _login(page) -> None:
    if not settings.tiktok_username or not settings.tiktok_password:
        raise RuntimeError("tiktok_username/password not set; cannot login")

    page.goto(LOGIN_URL, wait_until="domcontentloaded")
    page.wait_for_selector('input[name="username"]', timeout=15000)
    page.fill('input[name="username"]', settings.tiktok_username)
    page.fill('input[type="password"]', settings.tiktok_password)
    page.click('button[data-e2e="login-button"]')

    # Wait for either successful redirect or a 2FA prompt
    try:
        page.wait_for_url(re.compile(r".*tiktok\.com/(foryou|messages|@).*"), timeout=30000)
        logger.info("tiktok: logged in")
    except Exception:
        logger.warning("tiktok login: 2FA may be required. Set TIKTOK_HEADLESS=false and complete manually once; profile will persist.")
        raise


def fetch_inbox_threads(limit: int = 20) -> list[dict]:
    """Return a list of {thread_id, username, last_msg_preview, unread} for top inbox threads."""
    page = get_page()
    page.goto(INBOX_URL, wait_until="domcontentloaded")
    try:
        page.wait_for_selector(INBOX_ITEM_SEL, timeout=10000)
    except Exception:
        return []

    items = page.query_selector_all(INBOX_ITEM_SEL)
    out = []
    for el in items[:limit]:
        try:
            thread_id = el.get_attribute("data-thread-id") or el.get_attribute("data-conversation-id") or ""
            username_el = el.query_selector('[data-e2e="chat-list-item-username"], strong, h4')
            username = username_el.inner_text().strip() if username_el else ""
            unread_badge = el.query_selector('[class*="unread"], [data-e2e="chat-list-item-unread"]')
            unread = bool(unread_badge)
            preview_el = el.query_selector('[class*="preview"], p')
            preview = preview_el.inner_text().strip() if preview_el else ""
            out.append({
                "thread_id": thread_id or username,
                "username": username,
                "preview": preview,
                "unread": unread,
                "_handle": el,
            })
        except Exception:
            continue
    return out


def open_thread_and_extract_messages(thread: dict, max_msgs: int = 10) -> list[dict]:
    """Click into a thread, return up to max_msgs newest messages.

    Each message: {message_id, text, video_url, image_url, from_me, username}
    """
    page = get_page()
    handle = thread.get("_handle")
    try:
        if handle:
            handle.click()
        else:
            return []
        page.wait_for_selector(MESSAGE_ITEM_SEL, timeout=10000)
    except Exception:
        return []

    items = page.query_selector_all(MESSAGE_ITEM_SEL)
    out = []
    for el in items[-max_msgs:]:
        try:
            mid = el.get_attribute("data-message-id") or el.get_attribute("data-id") or ""
            classes = (el.get_attribute("class") or "").lower()
            from_me = "me" in classes or "outgoing" in classes or "self" in classes

            text_el = el.query_selector('[data-e2e="chat-item-text"], p, span')
            text = text_el.inner_text().strip() if text_el else ""

            video_url = None
            anchors = el.query_selector_all("a")
            for a in anchors:
                href = a.get_attribute("href") or ""
                if VIDEO_HREF_RE.search(href):
                    video_url = VIDEO_HREF_RE.search(href).group(0)
                    break
            if not video_url and text:
                m = VIDEO_HREF_RE.search(text)
                if m:
                    video_url = m.group(0)

            image_url = None
            img = el.query_selector("img")
            if img:
                src = img.get_attribute("src") or ""
                # skip avatar thumbnails (heuristic: avatars are small / contain 'avatar')
                if "avatar" not in src.lower() and src.startswith("http"):
                    image_url = src

            if not mid:
                # fallback: hash content + position
                mid = f"{thread.get('thread_id','')}:{len(out)}:{(text or video_url or image_url or '')[:40]}"

            out.append({
                "message_id": mid,
                "text": text,
                "video_url": video_url,
                "image_url": image_url,
                "from_me": from_me,
                "username": thread.get("username"),
            })
        except Exception:
            continue
    return out


def send_text(thread: dict | None, tt_user_id: str, text: str) -> None:
    """Send a DM in the currently open thread (or open a thread by user id)."""
    page = get_page()

    if thread and thread.get("_handle"):
        try:
            thread["_handle"].click()
        except Exception:
            pass
    elif tt_user_id:
        page.goto(f"https://www.tiktok.com/messages?lang=en&u={tt_user_id}", wait_until="domcontentloaded")

    try:
        page.wait_for_selector(INPUT_SEL, timeout=10000)
        page.click(INPUT_SEL)
        page.keyboard.type(text, delay=20)
        time.sleep(0.3)
        page.click(SEND_BTN_SEL)
    except Exception:
        logger.exception("tiktok send_text failed")
        raise


def thread_user_id(thread: dict) -> str:
    """Best-effort extract sender user id. TikTok DOM doesn't always expose this; falls back to username."""
    handle = thread.get("_handle")
    if handle:
        uid = handle.get_attribute("data-user-id")
        if uid:
            return uid
    return thread.get("username") or ""


def shutdown() -> None:
    try:
        if _browser_state["context"]:
            _browser_state["context"].close()
        if _browser_state["playwright"]:
            _browser_state["playwright"].stop()
    except Exception:
        pass
    _browser_state["page"] = None
    _browser_state["context"] = None
    _browser_state["playwright"] = None
