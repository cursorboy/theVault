import logging
import re

import httpx
from app.config import settings

SENDBLUE_BASE = "https://api.sendblue.co/api"
logger = logging.getLogger(__name__)


def _normalize_number(number: str) -> str:
    digits = re.sub(r"\D", "", number)
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return f"+{digits}" if not number.startswith("+") else number


async def send_message(to_number: str, content: str) -> dict:
    normalized = _normalize_number(to_number)
    logger.info("Sending to %s: %s", normalized, content[:50])
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SENDBLUE_BASE}/send-message",
            headers={
                "sb-api-key-id": settings.sendblue_api_key,
                "sb-api-secret-key": settings.sendblue_api_secret,
                "Content-Type": "application/json",
            },
            json={"number": normalized, "content": content, "from_number": "+17862139361"},
            timeout=30,
        )
        if not resp.is_success:
            logger.error("Sendblue error %s: %s", resp.status_code, resp.text)
        resp.raise_for_status()
        return resp.json()
