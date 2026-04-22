import json
from dataclasses import dataclass

import anthropic
from app.config import settings

CATEGORY_DESCRIPTIONS = {
    "professional": "Work tips, career advice, business content, professional skills",
    "things-to-do": "Activities, experiences, events, travel, entertainment",
    "places-to-eat": "Restaurants, cafes, food spots, dining recommendations",
    "coding-projects": "Programming, software development, tech tutorials, coding",
    "shopping": "Products, reviews, recommendations, deals, fashion, gear",
    "fitness": "Workouts, exercise, health, nutrition, wellness",
    "recipes": "Cooking tutorials, food preparation, meal ideas",
    "other": "Content that doesn't fit the above categories",
}

SYNTHESIS_PROMPT = """\
You are analyzing a short-form video (TikTok or Instagram Reel). Produce a structured JSON summary.

Categories and their descriptions:
{category_descriptions}

Video transcript:
{transcript}

Frame descriptions:
{frame_descriptions}

User-provided caption (if any):
{caption}

Return ONLY valid JSON with this exact structure:
{{
  "title": "string (max 80 chars, descriptive)",
  "summary": "string (2-4 sentences)",
  "tags": ["tag1", "tag2", "tag3"],
  "action_items": ["step1", "step2"],
  "category": "one of the 8 category slugs above",
  "category_confidence": 0.0
}}

Rules:
- title: concise, descriptive, no clickbait
- summary: what the video is about and key takeaways
- tags: 3-6 relevant tags, lowercase, no spaces
- action_items: concrete steps viewer could take (empty array if not applicable)
- category: pick the single best fit from the 8 slugs
- category_confidence: float 0.0-1.0 for how confident you are in the category
- If user caption is provided, weight it heavily for category selection
"""


@dataclass
class SynthesisResult:
    title: str
    summary: str
    tags: list[str]
    action_items: list[str]
    category: str
    category_confidence: float


def synthesize(
    transcript: str,
    frame_descriptions: list[str],
    caption: str = "",
) -> SynthesisResult:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    prompt = SYNTHESIS_PROMPT.format(
        category_descriptions="\n".join(f"- {k}: {v}" for k, v in CATEGORY_DESCRIPTIONS.items()),
        transcript=transcript[:4000] if transcript else "(no transcript)",
        frame_descriptions="\n".join(f"Frame {i+1}: {d}" for i, d in enumerate(frame_descriptions)) or "(no frames)",
        caption=caption or "(none)",
    )

    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = msg.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    data = json.loads(raw)

    return SynthesisResult(
        title=data.get("title", "")[:80],
        summary=data.get("summary", ""),
        tags=data.get("tags", []),
        action_items=data.get("action_items", []),
        category=data.get("category", "other"),
        category_confidence=float(data.get("category_confidence", 0.5)),
    )
