import httpx
from app.config import settings

SENDBLUE_BASE = "https://api.sendblue.co/api"


def send_message_sync(to_number: str, content: str) -> dict:
    with httpx.Client() as client:
        resp = client.post(
            f"{SENDBLUE_BASE}/send-message",
            headers={
                "sb-api-key-id": settings.sendblue_api_key,
                "sb-api-secret-key": settings.sendblue_api_secret,
                "Content-Type": "application/json",
            },
            json={"number": to_number, "content": content},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
