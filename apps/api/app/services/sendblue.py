import logging
import re

import httpx
from app.config import settings

SENDBLUE_BASE = "https://api.sendblue.co/api"
FROM_NUMBER = "+17862139361"
logger = logging.getLogger(__name__)


def _normalize_number(number: str) -> str:
    digits = re.sub(r"\D", "", number)
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return f"+{digits}" if not number.startswith("+") else number


def _auth_headers() -> dict:
    return {
        "sb-api-key-id": settings.sendblue_api_key,
        "sb-api-secret-key": settings.sendblue_api_secret,
        "Content-Type": "application/json",
    }


async def send_message(to_number: str, content: str) -> dict:
    normalized = _normalize_number(to_number)
    logger.info("Sending to %s: %s", normalized, content[:50])
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SENDBLUE_BASE}/send-message",
            headers=_auth_headers(),
            json={
                "number": normalized,
                "content": content,
                "from_number": FROM_NUMBER,
                "send_style": "",
            },
            timeout=30,
        )
        if not resp.is_success:
            logger.error("Sendblue error %s: %s", resp.status_code, resp.text)
        resp.raise_for_status()
        return resp.json()


async def send_typing_indicator(to_number: str) -> None:
    """Show the blue '...' typing bubble. Tries both Sendblue API hosts."""
    normalized = _normalize_number(to_number)
    payload = {"number": normalized, "from_number": FROM_NUMBER}
    last_err = None
    for base in ("https://api.sendblue.co/api", "https://api.sendblue.com/api"):
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{base}/send-typing-indicator",
                    headers=_auth_headers(),
                    json=payload,
                    timeout=5,
                )
                if resp.is_success:
                    logger.info("typing indicator OK via %s", base)
                    return
                last_err = f"{base} → {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            last_err = f"{base} → {e}"
    logger.warning("typing indicator failed on both hosts: %s", last_err)


async def mark_read(to_number: str) -> None:
    """Mark the most recent inbound message from this number as read."""
    normalized = _normalize_number(to_number)
    payload = {"number": normalized, "from_number": FROM_NUMBER}
    for base in ("https://api.sendblue.co/api", "https://api.sendblue.com/api"):
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{base}/mark-read",
                    headers=_auth_headers(),
                    json=payload,
                    timeout=5,
                )
                if resp.is_success:
                    return
        except Exception:
            continue
