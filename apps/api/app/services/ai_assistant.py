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

import anthropic
import dateparser
from sqlalchemy import desc, func, text
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Category, Conversation, Memory, Reminder, Save, User
from app.services import memory as mem
from app.services.embedder import embed_text

logger = logging.getLogger(__name__)

MODEL = "claude-opus-4-7"
REACTION_MODEL = "claude-opus-4-7"
MAX_TOOL_ITERATIONS = 5

SYSTEM_PROMPT = """You are Vault — a thoughtful, witty AI assistant living inside a user's iMessage. You help them curate short-form videos (TikTok, Instagram) and learn from what they save.

# Who you are
- Conversational, warm, direct. Texting, not essays.
- 1-3 sentences usually. 4 max. Never wall-of-text.
- Opinionated but never preachy. You push back thoughtfully.
- You genuinely remember and care — reference their goals, projects, and past conversations naturally.
- Minimal punctuation. Lowercase sometimes fine. No em-dashes. No bullet lists unless asked.

# What you know
You have persistent memory of this user across all conversations. Use the MEMORIES section below as your ground truth about who they are — their goals, projects, preferences, relationships, traits.

You also have access to their video library via tools. Don't guess — search when you need to.

# How you respond
- When they save a video: react authentically. Surface the most useful insight. Tie to their goals/projects when relevant. Ask a sharp follow-up only when it adds value.
- When they ask a question: answer directly using memories + library. Search the library if unsure.
- When they chat casually: be a real conversational partner. Show you remember them.
- When they ask for recs: pull from their library first, then from what you know about them.

# Tool use
You have tools for searching their library, fetching save details, setting reminders, and noting new facts about them. USE THEM. Don't claim you don't know something you can look up.

# Rules
- Never output JSON or markdown to the user.
- Never invent facts you don't have memories for.
- If they say something surprising/important about themselves, use remember_fact to note it.
- If a reminder is implied (even loosely), offer it or set it.
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
    """Assemble memory + library stats + retrieved conversation snippets."""
    # Top relevant memories via semantic search
    relevant_memories = mem.retrieve_relevant_memories(db, user.id, current_message, limit=12)
    # Plus top-importance memories (always include)
    top_mems = (
        db.query(Memory)
        .filter(Memory.user_id == user.id, Memory.superseded_by.is_(None), Memory.importance >= 7)
        .order_by(Memory.importance.desc())
        .limit(8)
        .all()
    )
    seen = {m.id for m in relevant_memories}
    merged_memories = relevant_memories + [m for m in top_mems if m.id not in seen]

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

    # Retrieve relevant past conversations (not the current thread)
    relevant_convos = mem.retrieve_relevant_conversations(db, user.id, current_message, limit=4)

    parts = []
    parts.append("# MEMORIES (your ground truth about this user)")
    parts.append(mem.format_memories_for_prompt(merged_memories))

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
            tool_uses = [b for b in response.content if b.type == "tool_use"]
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
        final_text = "hmm, got tangled up. try again?"

    # Store assistant reply
    assistant_conv = mem.store_conversation_turn(db, user.id, "assistant", final_text)

    # Background: extract memories from the exchange
    try:
        mem.extract_memories_from_exchange(
            db, user.id, user_message, final_text, source_conversation_id=user_conv.id
        )
    except Exception:
        logger.exception("Memory extraction failed (non-fatal)")

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
        tool_uses = [b for b in response.content if b.type == "tool_use"]
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
