from __future__ import annotations

"""Vault AI assistant — Opus-powered, memory-rich, tool-using.

Architecture:
1. User message arrives → stored with embedding in conversations
2. Relevant semantic memories retrieved via vector similarity
3. Relevant past conversation snippets retrieved via vector similarity
4. Recent conversation thread (last 8) for continuity
5. Claude Opus 4.7 with tool access: search library, get save, set reminder, update memory
6. Reply stored → background memory extraction from exchange
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any

import random
import re

import anthropic
import dateparser
from sqlalchemy import desc, func, text
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Category, Conversation, Memory, Reminder, Save, User
from app.services import memory as mem
from app.services.embedder import embed_text

logger = logging.getLogger(__name__)

MODEL = "claude-haiku-4-5-20251001"  # haiku for chat - much faster
REACTION_MODEL = "claude-sonnet-4-6"  # sonnet for reactions - good balance
MAX_TOOL_ITERATIONS = 3

ERROR_REPLIES = [
    "brain fart. say that again?",
    "wait what, try once more",
    "lost the plot rn. one more time?",
    "hmm didnt catch that, retry?",
    "bro my brain stalled. say it again",
    "that one broke me. resend?",
    "nope blanked. try again",
    "whoops lost signal. say that one more time",
    "ok redo, i fumbled",
    "hmm something glitched, one more try",
    "lagged out for a sec. retry?",
    "that flew past me. say again",
    "my bad, got scrambled. resend",
    "wait ran into a wall. try that again",
]


def _random_error() -> str:
    return random.choice(ERROR_REPLIES)


# Strips characters/patterns that violate the gen-z voice regardless of what Claude outputs.
_EMOJI_RE = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F680-\U0001F6FF"  # transport
    "\U0001F1E0-\U0001F1FF"  # flags
    "\U0001F700-\U0001F77F"
    "\U0001F780-\U0001F7FF"
    "\U0001F800-\U0001F8FF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FA6F"
    "\U0001FA70-\U0001FAFF"
    "\U00002700-\U000027BF"
    "\U00002600-\U000026FF"
    "]+",
    flags=re.UNICODE,
)


def _sanitize_voice(text: str) -> str:
    """Enforce the gen-z text style: lowercase, no em dash, no emojis, no markdown, no trailing period, no exclaim."""
    # Remove emojis
    text = _EMOJI_RE.sub("", text)
    # Strip markdown bold/italic: **x** __x__ *x* _x_
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"__(.+?)__", r"\1", text)
    text = re.sub(r"(?<!\w)\*(?!\s)(.+?)(?<!\s)\*(?!\w)", r"\1", text)
    text = re.sub(r"(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)", r"\1", text)
    # Strip markdown headers / blockquotes / list markers at line starts
    text = re.sub(r"^\s*#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*>\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+[.)]\s+", "", text, flags=re.MULTILINE)
    # Strip markdown link wrappers [text](url) -> text url
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 \2", text)
    # Em dashes and en dashes -> comma
    text = text.replace("—", ",").replace("–", ",")
    # Smart quotes -> regular
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    # Exclaim -> nothing
    text = re.sub(r"!+", "", text)
    # Lowercase
    text = text.lower()
    # Remove lines that are only punctuation / orphan commas
    cleaned_lines = []
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped and re.fullmatch(r"[,.;:\-]+", stripped):
            # orphan punctuation line — merge into previous line
            if cleaned_lines:
                cleaned_lines[-1] = cleaned_lines[-1].rstrip() + stripped
            continue
        cleaned_lines.append(line)
    text = "\n".join(cleaned_lines)
    # Collapse 3+ newlines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Collapse multiple spaces/tabs
    text = re.sub(r"[ \t]+", " ", text)
    # Strip trailing period(s) per line
    lines = [re.sub(r"[.]+$", "", l).rstrip() for l in text.split("\n")]
    text = "\n".join(lines).strip()
    return text

SYSTEM_PROMPT = """you're vault. you live in someone's imessage and help them track the videos they save (tiktok, ig reels). youre that one friend who remembers everything, has good takes, and looks stuff up when u dont know.

# how you text
this is the most important part. read carefully.

- all lowercase. always. never capitalize anything including "i"
- no periods at the end of sentences. ever. just let it end
- no em dashes ever. use a comma or start a new line
- no emojis ever
- no exclamation points
- keep it short. like really short. 1-2 sentences usually. max 3 if u really need it
- never write paragraphs
- never use markdown: no **bold**, no *italic*, no __x__, no headers (#), no backticks, no blockquotes, no bullet points, no numbered lists. this applies to web search results too, rewrite them in plain prose
- never put punctuation alone on its own line. if u use a comma, keep it inline with the previous sentence
- never output json
- contractions always (dont, wont, cant, youre, its, im)
- abbreviations fine but dont force them. natural ones: u, ur, rn, tbh, ngl, fr, lowkey, ong, iykyk, no cap, bet, deadass, fs. one or two per message max
- "lol" "lmao" occasionally not every message
- "?" or "??" for genuine questions
- never sycophantic. no "great question" "love that" "absolutely" "awesome"

# interpretation rules (absolutely critical)
NEVER ASSUME ANYTHING. this is the single most important rule.

- dont infer. dont interpret. dont fill in gaps.
- if u dont know something for sure, ask. one quick question, not an interview
- never assume status, role, gender, age, location, profession, relationships, goals, mood, tone, or intent
- never flatter. never say "youre a big deal" or "youre crushing it" or "thats amazing"
- if a message is even slightly ambiguous, ask a clarifier before responding
- if they say "im big in X" ask "into it as a hobby or as work?" or similar
- if they mention a name, ask who that is before acting
- if they ask for recs, ask what kind before searching
- memories in the context are ground truth, but dont extrapolate beyond whats written there
- when storing a fact, only store what they literally said, not what u inferred from it

# building their profile
u should know basic things about this user. if the MEMORIES block is missing any of these, casually ask over time (not all at once, one per convo, only if natural):
- their name
- what they do (work/study)
- where theyre based
- what theyre into rn (hobbies, projects, goals)
- anything else that helps u know them

never interview them. just ask one casual thing when theres a natural opening. if they share it, use remember_fact to store it with the right kind (fact for name/location, project for what theyre working on, etc).

# when u dont have the answer
if they ask about a topic and u dont see a matching save in their library, say so honestly and offer to look it up on the web. example:
- "dont think u saved anything on that. want me to look it up?"
- "nothin in ur vault for that. lemme search real quick"
then use the web_search tool. when u get results, share 1-3 of the most relevant with their link, written casually. dont dump 10 results. pick the best ones.

# tool usage
- search_library: search their saves semantically
- get_save_details: full transcript of a specific save
- recent_saves: list by recency or category
- set_reminder: schedule a reminder tied to a save
- remember_fact: STORE new info about the user (name, goals, projects, traits). use this liberally when they share things
- search_memories: recall specific facts
- web_search: search the public web when library has no match or when they ask about current events / recs

use tools. dont guess. dont claim u dont know something without searching first.

# how to respond by scenario
- saved a video: react fast, surface the useful thing, tie to a goal if relevant, maybe offer reminder
- asked about their saves: search the library first, answer from results
- asked a general question (not about saves): if relevant to their interests check library first, otherwise web_search and share links
- chatting: be their friend who remembers them. occasionally ask a profile-filling question if natural
- they share a fact about themselves: acknowledge it genuinely (not with hype), remember_fact it

examples of good voice:
- "oh thats the zone 2 cardio one right. want a reminder tmrw morning?"
- "nothin in ur vault on that. want me to search the web?"
- "wait whats ur name btw"
- "got a few pasta saves. the carbonara one from last week looks easiest"
- "hmm u havent saved anything like that. searching now"
- "ok so ur into tech startups. working on something or just following the space?"

bad examples:
- "Yeah I know, ur kinda a big deal lol" (wrong interpretation, flattery)
- "Based on your preferences..." (corporate)
- "Absolutely! Let me help..." (sycophant, exclaim)
- "Here's what I found: 1. ... 2. ... 3. ..." (list format)
"""


# ==================== TOOL DEFINITIONS ====================

TOOLS: list[dict[str, Any]] = [
    {
        "name": "search_library",
        "description": "Semantic search across the user's saved videos. Returns top matches with title, summary, tags, and save URL.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "What to search for, in plain English"},
                "limit": {"type": "integer", "description": "Max results (default 5)", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_save_details",
        "description": "Get full details of a specific save including full transcript, action items, and original URL.",
        "input_schema": {
            "type": "object",
            "properties": {"save_id": {"type": "string", "description": "UUID of the save"}},
            "required": ["save_id"],
        },
    },
    {
        "name": "recent_saves",
        "description": "List the user's most recent saves (default 10). Use when they ask 'what did I save recently' or for general overview.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "default": 10},
                "category_slug": {"type": "string", "description": "Optional: filter by category slug"},
            },
        },
    },
    {
        "name": "set_reminder",
        "description": "Set a reminder tied to a specific save. Use natural language times like 'tomorrow at 9am', 'in 3 days', 'next monday'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "save_id": {"type": "string"},
                "when": {"type": "string", "description": "Natural language time"},
                "note": {"type": "string", "description": "Optional reminder context"},
            },
            "required": ["save_id", "when"],
        },
    },
    {
        "name": "remember_fact",
        "description": "Store a durable fact about the user that should be remembered forever. Only use for genuinely new, durable info (goals, projects, preferences, traits, relationships). Don't use for ephemeral chat.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fact": {"type": "string", "description": "The fact in first-person perspective, e.g. 'user is training for NYC marathon in Nov 2026'"},
                "kind": {
                    "type": "string",
                    "enum": ["fact", "preference", "goal", "relationship", "project", "trait"],
                },
                "importance": {"type": "integer", "minimum": 1, "maximum": 10, "default": 6},
            },
            "required": ["fact", "kind"],
        },
    },
    {
        "name": "search_memories",
        "description": "Search the user's long-term memory for specific facts/preferences/goals. Use when you need a specific piece of info not already surfaced.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
    {
        "type": "web_search_20250305",
        "name": "web_search",
        "max_uses": 3,
    },
]


# ==================== TOOL IMPLEMENTATIONS ====================

def _tool_search_library(db: Session, user: User, query: str, limit: int = 5) -> list[dict]:
    try:
        emb = embed_text(query)
    except Exception:
        return []
    result = db.execute(
        text("""
            SELECT id, title, summary, tags, source_url, category_id, created_at,
                   (embedding <=> CAST(:emb AS vector)) AS distance
            FROM saves
            WHERE user_id = :uid AND status = 'done' AND embedding IS NOT NULL
            ORDER BY distance ASC
            LIMIT :lim
        """),
        {"emb": json.dumps(emb), "uid": str(user.id), "lim": limit},
    )
    cat_map = {c.id: c.label for c in db.query(Category).all()}
    rows = result.fetchall()
    return [
        {
            "id": str(r.id),
            "title": r.title or "Untitled",
            "summary": r.summary or "",
            "tags": r.tags or [],
            "category": cat_map.get(r.category_id, "?"),
            "source_url": r.source_url,
            "saved_on": r.created_at.strftime("%Y-%m-%d") if r.created_at else "",
        }
        for r in rows
    ]


def _tool_get_save_details(db: Session, user: User, save_id: str) -> dict:
    try:
        import uuid
        save = db.get(Save, uuid.UUID(save_id))
    except Exception:
        return {"error": "invalid save id"}
    if not save or save.user_id != user.id:
        return {"error": "save not found"}
    cat_map = {c.id: c.label for c in db.query(Category).all()}
    return {
        "id": str(save.id),
        "title": save.title,
        "summary": save.summary,
        "transcript": (save.transcript or "")[:3000],
        "tags": save.tags or [],
        "action_items": save.action_items or [],
        "category": cat_map.get(save.category_id, "?"),
        "source_url": save.source_url,
        "saved_on": save.created_at.strftime("%Y-%m-%d") if save.created_at else "",
    }


def _tool_recent_saves(db: Session, user: User, limit: int = 10, category_slug: str | None = None) -> list[dict]:
    q = db.query(Save).filter(Save.user_id == user.id, Save.status == "done")
    if category_slug:
        cat = db.query(Category).filter(Category.slug == category_slug).first()
        if cat:
            q = q.filter(Save.category_id == cat.id)
    saves = q.order_by(Save.created_at.desc()).limit(limit).all()
    cat_map = {c.id: c.label for c in db.query(Category).all()}
    return [
        {
            "id": str(s.id),
            "title": s.title or "Untitled",
            "summary": (s.summary or "")[:200],
            "category": cat_map.get(s.category_id, "?"),
            "tags": s.tags or [],
            "saved_on": s.created_at.strftime("%Y-%m-%d") if s.created_at else "",
        }
        for s in saves
    ]


def _tool_set_reminder(db: Session, user: User, save_id: str, when: str, note: str | None = None) -> dict:
    import uuid
    try:
        save = db.get(Save, uuid.UUID(save_id))
    except Exception:
        return {"error": "invalid save id"}
    if not save or save.user_id != user.id:
        return {"error": "save not found"}
    fire_at = dateparser.parse(when, settings={"RETURN_AS_TIMEZONE_AWARE": True, "PREFER_DATES_FROM": "future"})
    if not fire_at:
        return {"error": f"couldn't parse time '{when}'"}
    reminder = Reminder(user_id=user.id, save_id=save.id, fire_at=fire_at, status="pending")
    db.add(reminder)
    db.commit()
    return {
        "reminder_id": str(reminder.id),
        "fire_at": fire_at.isoformat(),
        "fire_at_friendly": fire_at.strftime("%B %d at %I:%M %p"),
        "for_save": save.title,
    }


def _tool_remember_fact(db: Session, user: User, fact: str, kind: str, importance: int = 6) -> dict:
    try:
        emb = embed_text(fact)
    except Exception:
        emb = None
    new_mem = Memory(
        user_id=user.id,
        content=fact,
        kind=kind,
        importance=max(1, min(10, importance)),
        embedding=emb,
    )
    db.add(new_mem)
    db.commit()
    db.refresh(new_mem)
    # Opportunistic consolidation
    try:
        mem.consolidate_similar(db, user.id, new_mem)
    except Exception:
        logger.exception("consolidate after remember_fact failed")
    return {"memory_id": str(new_mem.id), "stored": fact}


def _tool_search_memories(db: Session, user: User, query: str) -> list[dict]:
    memories = mem.retrieve_relevant_memories(db, user.id, query, limit=8)
    return [{"kind": m.kind, "content": m.content, "importance": m.importance} for m in memories]


CLIENT_TOOLS = {
    "search_library", "get_save_details", "recent_saves",
    "set_reminder", "remember_fact", "search_memories",
}


def _dispatch_tool(db: Session, user: User, tool_name: str, tool_input: dict) -> Any:
    try:
        if tool_name == "search_library":
            return _tool_search_library(db, user, **tool_input)
        if tool_name == "get_save_details":
            return _tool_get_save_details(db, user, **tool_input)
        if tool_name == "recent_saves":
            return _tool_recent_saves(db, user, **tool_input)
        if tool_name == "set_reminder":
            return _tool_set_reminder(db, user, **tool_input)
        if tool_name == "remember_fact":
            return _tool_remember_fact(db, user, **tool_input)
        if tool_name == "search_memories":
            return _tool_search_memories(db, user, **tool_input)
        return {"error": f"unknown tool {tool_name}"}
    except Exception as e:
        logger.exception("Tool %s failed", tool_name)
        return {"error": str(e)}


# ==================== CONTEXT ASSEMBLY ====================

def _build_context_block(db: Session, user: User, current_message: str) -> str:
    """Assemble memory + library stats. Trimmed for speed."""
    # Only fetch top-importance memories (skip semantic retrieval — recent thread covers it)
    top_mems = (
        db.query(Memory)
        .filter(Memory.user_id == user.id, Memory.superseded_by.is_(None))
        .order_by(Memory.importance.desc(), Memory.created_at.desc())
        .limit(8)
        .all()
    )
    merged_memories = top_mems

    # Library stats
    total_saves = db.query(Save).filter(Save.user_id == user.id, Save.status == "done").count()
    cat_map = {c.id: c.label for c in db.query(Category).all()}
    recent_saves_rows = (
        db.query(Save)
        .filter(Save.user_id == user.id, Save.status == "done")
        .order_by(Save.created_at.desc())
        .limit(5)
        .all()
    )

    relevant_convos: list = []

    # Check what we know vs what's missing for the profile
    all_mem_content = " ".join(m.content.lower() for m in merged_memories)
    missing = []
    if "name" not in all_mem_content:
        missing.append("name")
    if not any(k in all_mem_content for k in ["lives in", "based in", "from ", "location"]):
        missing.append("location")
    if not any(m.kind in ("project", "goal") for m in merged_memories):
        missing.append("current project or goal")
    if not any(m.kind == "trait" for m in merged_memories):
        missing.append("what theyre into")

    parts = []
    parts.append("# MEMORIES (your ground truth about this user)")
    parts.append(mem.format_memories_for_prompt(merged_memories))

    if missing:
        parts.append(f"\n# PROFILE GAPS (ask one of these casually if theres a natural opening, not as interview): {', '.join(missing)}")

    parts.append(f"\n# LIBRARY OVERVIEW")
    parts.append(f"Total saves: {total_saves}")
    if recent_saves_rows:
        parts.append("Most recent saves:")
        for s in recent_saves_rows:
            cat = cat_map.get(s.category_id, "?")
            parts.append(f"  - [{cat}] {s.title or 'Untitled'} (id: {s.id})")

    if relevant_convos:
        parts.append("\n# RELEVANT PAST CONVERSATIONS (semantic recall)")
        for c in relevant_convos:
            when = c.created_at.strftime("%b %d") if c.created_at else ""
            parts.append(f"  [{when}] {c.role}: {c.content[:200]}")

    return "\n".join(parts)


def _recent_thread(db: Session, user_id) -> list[dict]:
    """Last N conversation turns in chronological order, formatted as Claude messages."""
    msgs = mem.recent_conversations(db, user_id, limit=10)
    return [{"role": m.role, "content": m.content} for m in msgs]


# ==================== MAIN ENTRYPOINTS ====================

def chat(db: Session, user: User, user_message: str, save_id=None) -> str:
    """Handle a conversational message with tool use + deep memory."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Store user message with embedding
    user_conv = mem.store_conversation_turn(db, user.id, "user", user_message, save_id=save_id)

    # Assemble context
    context_block = _build_context_block(db, user, user_message)
    system = f"{SYSTEM_PROMPT}\n\n{context_block}"

    # Build messages: recent thread + current turn (already stored)
    messages = _recent_thread(db, user.id)
    if not messages or messages[-1]["content"] != user_message:
        messages.append({"role": "user", "content": user_message})

    # Tool-use loop
    final_text = ""
    for iteration in range(MAX_TOOL_ITERATIONS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=800,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            # Only dispatch client-side tools. Server-side tools (web_search) are handled by Anthropic.
            tool_uses = [b for b in response.content if b.type == "tool_use" and b.name in CLIENT_TOOLS]
            if not tool_uses:
                # No client-side tools to run (e.g. only server-side web_search); treat as end of turn.
                text_blocks = [b.text for b in response.content if b.type == "text"]
                final_text = "\n".join(text_blocks).strip()
                break
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for tu in tool_uses:
                result = _dispatch_tool(db, user, tu.name, tu.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": json.dumps(result) if not isinstance(result, str) else result,
                })
            messages.append({"role": "user", "content": tool_results})
            continue

        # end_turn or max_tokens
        text_blocks = [b.text for b in response.content if b.type == "text"]
        final_text = "\n".join(text_blocks).strip()
        break

    if not final_text:
        final_text = _random_error()

    final_text = _sanitize_voice(final_text)

    # Store assistant reply
    assistant_conv = mem.store_conversation_turn(db, user.id, "assistant", final_text)

    # Fire-and-forget memory extraction in a thread so we don't block the reply
    import threading
    def _extract():
        from app.database_sync import SyncSessionLocal
        db_bg = SyncSessionLocal()
        try:
            mem.extract_memories_from_exchange(
                db_bg, user.id, user_message, final_text, source_conversation_id=user_conv.id
            )
        except Exception:
            logger.exception("Memory extraction failed (non-fatal)")
        finally:
            db_bg.close()
    threading.Thread(target=_extract, daemon=True).start()

    return final_text


def react_to_save(db: Session, user: User, save: Save) -> str:
    """Generate a personalized, memory-aware reaction to a newly-saved video."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Extract memories from this save first, so they're in context
    try:
        mem.extract_memories_from_save(db, user, save)
    except Exception:
        logger.exception("Save memory extraction failed (non-fatal)")

    cat_map = {c.id: c.label for c in db.query(Category).all()}
    category_label = cat_map.get(save.category_id, "Other")
    context_block = _build_context_block(db, user, f"{save.title} {save.summary}")

    prompt = f"""The user just saved this video:

Title: {save.title or 'Untitled'}
Category: {category_label}
Summary: {save.summary or '(none)'}
Tags: {', '.join(save.tags or [])}
Action items: {'; '.join(save.action_items or []) or '(none)'}

React naturally in 1-3 sentences. Surface the most useful insight. Tie to a known goal/project if genuinely relevant (don't force it). If an action item is concrete and tied to a goal, offer a reminder. Don't repeat the title verbatim."""

    system = f"{SYSTEM_PROMPT}\n\n{context_block}"

    response = client.messages.create(
        model=REACTION_MODEL,
        max_tokens=400,
        system=system,
        tools=TOOLS,
        messages=[{"role": "user", "content": prompt}],
    )

    # Handle potential tool use in reactions too (e.g., might set a reminder)
    messages = [{"role": "user", "content": prompt}]
    for _ in range(MAX_TOOL_ITERATIONS):
        if response.stop_reason != "tool_use":
            break
        tool_uses = [b for b in response.content if b.type == "tool_use" and b.name in CLIENT_TOOLS]
        if not tool_uses:
            break
        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for tu in tool_uses:
            result = _dispatch_tool(db, user, tu.name, tu.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tu.id,
                "content": json.dumps(result) if not isinstance(result, str) else result,
            })
        messages.append({"role": "user", "content": tool_results})
        response = client.messages.create(
            model=REACTION_MODEL,
            max_tokens=400,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

    text_blocks = [b.text for b in response.content if b.type == "text"]
    reply = "\n".join(text_blocks).strip() or f"saved: {save.title}"
    reply = _sanitize_voice(reply)

    # Log the assistant reply
    mem.store_conversation_turn(db, user.id, "assistant", reply, save_id=save.id)
    return reply


def update_profile_if_needed(db: Session, user: User) -> None:
    """Periodic maintenance: with deep memory, the profile JSONB is now a cached summary.
    We refresh it every 10 saves from the memory store."""
    total = db.query(Save).filter(Save.user_id == user.id, Save.status == "done").count()
    if total == 0 or total % 10 != 0:
        return
    profile = user.profile or {}
    if profile.get("last_updated_at_count") == total:
        return

    top_memories = (
        db.query(Memory)
        .filter(Memory.user_id == user.id, Memory.superseded_by.is_(None))
        .order_by(Memory.importance.desc(), Memory.created_at.desc())
        .limit(20)
        .all()
    )

    interests = [m.content for m in top_memories if m.kind in ("preference", "project", "goal")][:8]
    notes_parts = [m.content for m in top_memories if m.kind in ("trait", "fact")][:3]

    user.profile = {
        **profile,
        "interests": interests,
        "notes": " ".join(notes_parts)[:500],
        "total_memories": len(top_memories),
        "last_updated_at_count": total,
        "last_updated_at": datetime.now(timezone.utc).isoformat(),
    }
    db.commit()
    logger.info("Refreshed profile cache for user %s (%d memories, %d saves)", user.id, len(top_memories), total)
