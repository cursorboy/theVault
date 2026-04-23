from __future__ import annotations

"""Deep memory layer: episodic (conversations) + semantic (extracted facts).

Uses vector similarity for retrieval, not just recency. Extracts durable facts
from conversations via LLM, consolidates duplicates, and tracks access patterns.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional

import anthropic
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Conversation, Memory, Save, User
from app.services.embedder import embed_text

logger = logging.getLogger(__name__)

EXTRACTION_MODEL = "claude-haiku-4-5-20251001"  # fast, cheap for extraction
CONSOLIDATION_MODEL = "claude-sonnet-4-6"

VALID_KINDS = {"fact", "preference", "goal", "relationship", "project", "trait"}

EXTRACTION_PROMPT = """Analyze this conversation exchange and extract durable memories about the user.

Exchange:
USER: {user_msg}
ASSISTANT: {assistant_msg}

Existing user context (don't re-extract what's already known):
{existing_memories}

Extract only NEW, durable facts. Skip:
- Transient statements ("I'm tired today")
- Information already captured above
- Generic pleasantries

Extract (in importance order):
- Goals ("training for marathon Nov 2026")
- Ongoing projects ("building a SaaS for contractors")
- Preferences ("prefers direct answers, hates hedging")
- Relationships ("partner Sarah works in design")
- Traits ("perfectionist, analytical thinker")
- Hard facts ("lives in Brooklyn, has celiac disease")

Return ONLY valid JSON:
{{
  "memories": [
    {{"content": "...", "kind": "goal|preference|project|relationship|trait|fact", "importance": 1-10}}
  ]
}}

Return {{"memories": []}} if nothing durable to extract."""


CONSOLIDATION_PROMPT = """You are consolidating a user's memory store. These memories are similar — decide what to do.

Candidate memories (may be duplicates, contradictions, or evolutions):
{candidates}

Return ONLY valid JSON:
{{
  "action": "merge|supersede|keep_all",
  "merged_content": "unified memory text (if merge)",
  "keep_id": "uuid of memory to keep (if supersede - others will be marked superseded)",
  "reason": "brief"
}}

Guidelines:
- merge: related facts that should be one memory (combine them)
- supersede: one is a newer/better version of the others (keep newest, mark others)
- keep_all: genuinely distinct memories (rare when this function is called)"""


def store_conversation_turn(db: Session, user_id, role: str, content: str, save_id=None) -> Conversation:
    """Store a conversation message with its embedding."""
    try:
        emb = embed_text(content)
    except Exception:
        logger.exception("Failed to embed conversation")
        emb = None

    conv = Conversation(user_id=user_id, role=role, content=content, save_id=save_id, embedding=emb)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def retrieve_relevant_conversations(db: Session, user_id, query_text: str, limit: int = 6) -> list[Conversation]:
    """Semantic search across conversation history."""
    try:
        emb = embed_text(query_text)
    except Exception:
        return []

    result = db.execute(
        text("""
            SELECT id, role, content, created_at,
                   (embedding <=> CAST(:emb AS vector)) AS distance
            FROM conversations
            WHERE user_id = :uid AND embedding IS NOT NULL
            ORDER BY distance ASC
            LIMIT :lim
        """),
        {"emb": json.dumps(emb), "uid": str(user_id), "lim": limit},
    )
    rows = result.fetchall()
    return [
        Conversation(id=r.id, role=r.role, content=r.content, created_at=r.created_at)
        for r in rows
    ]


def recent_conversations(db: Session, user_id, limit: int = 8) -> list[Conversation]:
    """Last N conversation turns in chronological order."""
    msgs = (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
        .limit(limit)
        .all()
    )
    msgs.reverse()
    return msgs


def retrieve_relevant_memories(db: Session, user_id, query_text: str, limit: int = 10) -> list[Memory]:
    """Semantic search over semantic memories. Also updates access tracking."""
    try:
        emb = embed_text(query_text)
    except Exception:
        return _top_important_memories(db, user_id, limit)

    result = db.execute(
        text("""
            SELECT id, content, kind, importance, created_at,
                   (embedding <=> CAST(:emb AS vector)) AS distance
            FROM memories
            WHERE user_id = :uid AND superseded_by IS NULL AND embedding IS NOT NULL
            ORDER BY distance ASC
            LIMIT :lim
        """),
        {"emb": json.dumps(emb), "uid": str(user_id), "lim": limit},
    )
    rows = result.fetchall()
    memory_ids = [r.id for r in rows]

    # Update access tracking in bulk
    if memory_ids:
        db.execute(
            update(Memory)
            .where(Memory.id.in_(memory_ids))
            .values(access_count=Memory.access_count + 1, last_accessed_at=func.now())
        )
        db.commit()

    return [
        Memory(id=r.id, content=r.content, kind=r.kind, importance=r.importance, created_at=r.created_at)
        for r in rows
    ]


def _top_important_memories(db: Session, user_id, limit: int = 10) -> list[Memory]:
    """Fallback when embedding isn't available: return highest-importance active memories."""
    return (
        db.query(Memory)
        .filter(Memory.user_id == user_id, Memory.superseded_by.is_(None))
        .order_by(Memory.importance.desc(), Memory.created_at.desc())
        .limit(limit)
        .all()
    )


def extract_memories_from_exchange(
    db: Session,
    user_id,
    user_message: str,
    assistant_reply: str,
    source_conversation_id=None,
) -> list[Memory]:
    """Run LLM extraction on a conversation exchange, store new durable memories."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Fetch existing memories for dedup context
    existing = (
        db.query(Memory)
        .filter(Memory.user_id == user_id, Memory.superseded_by.is_(None))
        .order_by(Memory.importance.desc())
        .limit(30)
        .all()
    )
    existing_text = "\n".join(f"- [{m.kind}] {m.content}" for m in existing) or "(none yet)"

    prompt = EXTRACTION_PROMPT.format(
        user_msg=user_message[:1500],
        assistant_msg=assistant_reply[:1500],
        existing_memories=existing_text,
    )

    try:
        msg = client.messages.create(
            model=EXTRACTION_MODEL,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
    except Exception:
        logger.exception("Memory extraction failed")
        return []

    created: list[Memory] = []
    for item in data.get("memories", []):
        content = item.get("content", "").strip()
        kind = item.get("kind", "fact")
        if kind not in VALID_KINDS or not content:
            continue
        importance = max(1, min(10, int(item.get("importance", 5))))

        try:
            emb = embed_text(content)
        except Exception:
            emb = None

        mem = Memory(
            user_id=user_id,
            content=content,
            kind=kind,
            importance=importance,
            embedding=emb,
            source_conversation_id=source_conversation_id,
        )
        db.add(mem)
        created.append(mem)

    if created:
        db.commit()
        for m in created:
            db.refresh(m)
        logger.info("Extracted %d new memories for user %s", len(created), user_id)
        # Opportunistic consolidation after extraction
        for mem in created:
            try:
                consolidate_similar(db, user_id, mem)
            except Exception:
                logger.exception("Consolidation failed for memory %s", mem.id)

    return created


def extract_memories_from_save(db: Session, user: User, save: Save) -> list[Memory]:
    """Extract interest/preference signals from a saved video."""
    if not save.title and not save.summary:
        return []

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    existing = (
        db.query(Memory)
        .filter(Memory.user_id == user.id, Memory.superseded_by.is_(None))
        .order_by(Memory.importance.desc())
        .limit(30)
        .all()
    )
    existing_text = "\n".join(f"- [{m.kind}] {m.content}" for m in existing) or "(none yet)"

    prompt = f"""The user saved this video. Extract only DURABLE signals about their interests/goals.

Video:
- Title: {save.title}
- Summary: {save.summary}
- Tags: {', '.join(save.tags or [])}

Existing memories:
{existing_text}

Only extract if the save strongly suggests a lasting interest, goal, or project. A one-off save is not enough — look for signals that clarify WHY this person saved it (ties to a goal, project, or deep interest).

Return ONLY valid JSON: {{"memories": [{{"content": "...", "kind": "preference|goal|project", "importance": 1-10}}]}}
Return {{"memories": []}} if nothing durable."""

    try:
        msg = client.messages.create(
            model=EXTRACTION_MODEL,
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
    except Exception:
        logger.exception("Save memory extraction failed")
        return []

    created: list[Memory] = []
    for item in data.get("memories", []):
        content = item.get("content", "").strip()
        kind = item.get("kind", "preference")
        if kind not in VALID_KINDS or not content:
            continue
        importance = max(1, min(10, int(item.get("importance", 4))))

        try:
            emb = embed_text(content)
        except Exception:
            emb = None

        mem = Memory(
            user_id=user.id,
            content=content,
            kind=kind,
            importance=importance,
            embedding=emb,
            source_save_id=save.id,
        )
        db.add(mem)
        created.append(mem)

    if created:
        db.commit()
        logger.info("Extracted %d memories from save %s", len(created), save.id)

    return created


def consolidate_similar(db: Session, user_id, new_memory: Memory, threshold: float = 0.15) -> None:
    """Find memories very similar to the new one and decide: merge, supersede, or keep."""
    if new_memory.embedding is None:
        return

    # Find the top 3 most similar active memories (excluding itself)
    result = db.execute(
        text("""
            SELECT id, content, kind, importance,
                   (embedding <=> CAST(:emb AS vector)) AS distance
            FROM memories
            WHERE user_id = :uid
              AND superseded_by IS NULL
              AND id != :mid
              AND embedding IS NOT NULL
            ORDER BY distance ASC
            LIMIT 3
        """),
        {"emb": json.dumps([float(x) for x in new_memory.embedding]), "uid": str(user_id), "mid": str(new_memory.id)},
    )
    similars = [r for r in result.fetchall() if r.distance < threshold]

    if not similars:
        return

    candidates_text = f"NEW: [{new_memory.kind}] {new_memory.content} (id: {new_memory.id})\n" + "\n".join(
        f"EXISTING: [{r.kind}] {r.content} (id: {r.id})" for r in similars
    )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        msg = client.messages.create(
            model=CONSOLIDATION_MODEL,
            max_tokens=300,
            messages=[{"role": "user", "content": CONSOLIDATION_PROMPT.format(candidates=candidates_text)}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        decision = json.loads(raw)
    except Exception:
        logger.exception("Consolidation LLM call failed")
        return

    action = decision.get("action")
    all_ids = [new_memory.id] + [r.id for r in similars]

    if action == "merge" and decision.get("merged_content"):
        merged_content = decision["merged_content"]
        try:
            emb = embed_text(merged_content)
        except Exception:
            emb = None
        merged = Memory(
            user_id=user_id,
            content=merged_content,
            kind=new_memory.kind,
            importance=max(new_memory.importance, max(r.importance for r in similars)),
            embedding=emb,
        )
        db.add(merged)
        db.flush()
        # Supersede all originals
        db.execute(
            update(Memory).where(Memory.id.in_(all_ids)).values(superseded_by=merged.id)
        )
        db.commit()
        logger.info("Merged %d memories into %s", len(all_ids), merged.id)

    elif action == "supersede" and decision.get("keep_id"):
        keep_id = decision["keep_id"]
        to_supersede = [i for i in all_ids if str(i) != str(keep_id)]
        if to_supersede:
            db.execute(
                update(Memory).where(Memory.id.in_(to_supersede)).values(superseded_by=keep_id)
            )
            db.commit()
            logger.info("Superseded %d memories, kept %s", len(to_supersede), keep_id)


def format_memories_for_prompt(memories: list[Memory]) -> str:
    """Format memories as a prompt block, organized by kind."""
    if not memories:
        return "(no memories yet — still learning about this user)"

    by_kind: dict[str, list[Memory]] = {}
    for m in memories:
        by_kind.setdefault(m.kind, []).append(m)

    order = ["goal", "project", "preference", "relationship", "trait", "fact"]
    lines = []
    for kind in order:
        if kind not in by_kind:
            continue
        label = kind.upper() + "S"
        lines.append(f"{label}:")
        for m in sorted(by_kind[kind], key=lambda x: -x.importance):
            lines.append(f"  - {m.content}")
    return "\n".join(lines)
