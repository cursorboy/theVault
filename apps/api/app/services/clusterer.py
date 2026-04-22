import json
import uuid
from typing import Optional

import anthropic
from sqlalchemy.orm import Session
from app.config import settings
from app.models import Cluster, Save

DISTANCE_THRESHOLD = 0.25


def _generate_cluster_label(saves: list[Save]) -> str:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    titles = [s.title or "" for s in saves if s.title]
    prompt = f"Give a short 3-5 word label for a group of videos with these titles: {', '.join(titles[:10])}. Return only the label, nothing else."
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=20,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text.strip()


def assign_cluster(db: Session, save: Save, embedding: list[float]) -> None:
    """Find nearest cluster or create new one. Modifies save.cluster_id in place."""
    from pgvector.sqlalchemy import Vector
    from sqlalchemy import text

    # Find nearest save with a cluster
    result = db.execute(
        text("""
            SELECT cluster_id,
                   (embedding <=> CAST(:emb AS vector)) AS distance
            FROM saves
            WHERE user_id = :uid
              AND cluster_id IS NOT NULL
              AND embedding IS NOT NULL
            ORDER BY distance ASC
            LIMIT 1
        """),
        {"emb": json.dumps(embedding), "uid": str(save.user_id)},
    ).first()

    if result and result.distance < DISTANCE_THRESHOLD:
        save.cluster_id = result.cluster_id
        # Label cluster if it now has 3+ saves and no label yet
        cluster = db.get(Cluster, result.cluster_id)
        if cluster and cluster.label is None:
            cluster_saves = db.query(Save).filter(Save.cluster_id == result.cluster_id).all()
            if len(cluster_saves) >= 2:  # current save not yet flushed, so 2 = will be 3
                cluster.label = _generate_cluster_label(cluster_saves)
    else:
        new_cluster = Cluster(user_id=save.user_id)
        db.add(new_cluster)
        db.flush()
        save.cluster_id = new_cluster.id
