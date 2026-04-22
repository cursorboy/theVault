from openai import OpenAI
from app.config import settings


def transcribe_audio(audio_path: str) -> str:
    client = OpenAI(api_key=settings.openai_api_key)
    with open(audio_path, "rb") as f:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="text",
        )
    return result if isinstance(result, str) else result.text
