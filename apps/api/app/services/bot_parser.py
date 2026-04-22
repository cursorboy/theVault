import json
from dataclasses import dataclass, field
from typing import Optional

import anthropic
from app.config import settings

PARSE_PROMPT = """\
You are parsing a user's iMessage to determine their intent for a video-saving app.

The user's message: "{message}"

Recent save context (last saved video):
Title: {last_save_title}
ID: {last_save_id}

Classify the intent as one of:
- save_url: message contains a TikTok or Instagram URL
- remind_me: user wants a reminder (e.g. "remind me tomorrow", "remind me in 3 days")
- query_saves: user wants to search their saved videos (e.g. "search fitness", "find recipes")
- category_override: user wants to change the category of the last save
- digest_settings: user wants to change digest preferences
- unknown: none of the above

Return ONLY valid JSON:
{{
  "intent": "save_url|remind_me|query_saves|category_override|digest_settings|unknown",
  "params": {{
    "url": "string or null",
    "time_str": "string or null",
    "query": "string or null",
    "category_slug": "string or null"
  }}
}}
"""

VALID_INTENTS = {"save_url", "remind_me", "query_saves", "category_override", "digest_settings", "unknown"}


@dataclass
class ParsedIntent:
    intent: str
    url: Optional[str] = None
    time_str: Optional[str] = None
    query: Optional[str] = None
    category_slug: Optional[str] = None


def parse_message(
    message_text: str,
    last_save_title: str = "",
    last_save_id: str = "",
) -> ParsedIntent:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    prompt = PARSE_PROMPT.format(
        message=message_text,
        last_save_title=last_save_title or "(none)",
        last_save_id=last_save_id or "(none)",
    )

    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    data = json.loads(raw)
    params = data.get("params", {})
    intent = data.get("intent", "unknown")
    if intent not in VALID_INTENTS:
        intent = "unknown"

    return ParsedIntent(
        intent=intent,
        url=params.get("url"),
        time_str=params.get("time_str"),
        query=params.get("query"),
        category_slug=params.get("category_slug"),
    )
