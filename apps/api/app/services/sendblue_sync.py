import httpx
from app.config import settings


def send_message_sync(to_number: str, content: str) -> dict:
    with httpx.Client() as client:
        resp = client.post(
            f"{settings.bluebubbles_url}/api/v1/message/text",
            params={"guid": settings.bluebubbles_password},
            json={"chatGuid": f"any;-;{to_number}", "message": content},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()
