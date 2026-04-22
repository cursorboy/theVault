import hashlib
import hmac
import json
import logging

from fastapi import APIRouter, Header, HTTPException, Request
from app.config import settings
from app.services import sendblue

logger = logging.getLogger(__name__)
router = APIRouter()


def _verify_hmac(body: bytes, signature: str) -> bool:
    expected = hmac.new(
        settings.sendblue_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/webhook/sendblue")
async def sendblue_webhook(
    request: Request,
    x_sendblue_signature: str = Header(default=""),
):
    body = await request.body()

    if settings.sendblue_webhook_secret and not _verify_hmac(body, x_sendblue_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = json.loads(body)
    logger.info("Sendblue webhook: %s", payload)

    from_number = payload.get("number") or payload.get("from_number", "")
    content = payload.get("content", "")

    if not from_number:
        return {"ok": True}

    logger.info("Message from %s: %s", from_number, content)
    await sendblue.send_message(from_number, "Got it! Processing...")

    return {"ok": True}
