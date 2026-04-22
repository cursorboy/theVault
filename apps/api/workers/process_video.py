import logging
import os
import shutil
import sys
import uuid

# Allow imports from apps/api
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database_sync import SyncSessionLocal
from app.models import Save
from app.services import downloader, transcriber, vision, synthesizer, embedder, clusterer, sendblue_sync
from app.config import settings

logger = logging.getLogger(__name__)


def process_video(save_id: str) -> None:
    db = SyncSessionLocal()
    job_dir = f"/tmp/rv_{save_id}"
    os.makedirs(job_dir, exist_ok=True)

    try:
        save = db.get(Save, uuid.UUID(save_id))
        if not save:
            logger.error("Save %s not found", save_id)
            return

        _set_status(db, save, "downloading")
        result = downloader.download_video(save.source_url, job_dir)

        if not save.title:
            save.title = result.title
        if result.duration_secs:
            save.duration_secs = result.duration_secs
        db.flush()

        _set_status(db, save, "transcribing")
        transcript = transcriber.transcribe_audio(result.audio_path)
        save.transcript = transcript

        _set_status(db, save, "analyzing")
        frame_descriptions = vision.describe_frames(result.video_path, job_dir, save_id)

        _set_status(db, save, "synthesizing")
        synthesis = synthesizer.synthesize(transcript, frame_descriptions)
        save.title = save.title or synthesis.title
        save.summary = synthesis.summary
        save.tags = synthesis.tags
        save.action_items = synthesis.action_items
        save.category_confidence = synthesis.category_confidence

        # Resolve category
        from sqlalchemy import select
        from app.models import Category
        cat = db.execute(select(Category).where(Category.slug == synthesis.category)).scalar_one_or_none()
        if cat:
            save.category_id = cat.id

        # Embed and cluster
        embed_input = f"{save.title} {save.summary} {' '.join(save.tags or [])}"
        embedding = embedder.embed_text(embed_input)
        save.embedding = embedding
        clusterer.assign_cluster(db, save, embedding)

        save.status = "done"
        db.commit()

        # Send confirmation iMessage
        dashboard_url = f"{settings.app_url}/save/{save_id}"
        msg = f"Saved: {save.title} ({synthesis.category}) — {dashboard_url}"
        sendblue_sync.send_message_sync(save.user.phone, msg)

    except Exception as exc:
        logger.exception("process_video failed for %s", save_id)
        try:
            save = db.get(Save, uuid.UUID(save_id))
            if save:
                save.status = "failed"
                save.error_msg = str(exc)
                db.commit()
                sendblue_sync.send_message_sync(save.user.phone, "Couldn't save that one, sorry.")
        except Exception:
            db.rollback()
    finally:
        db.close()
        if os.path.exists(job_dir):
            shutil.rmtree(job_dir, ignore_errors=True)


def _set_status(db, save: Save, status: str) -> None:
    save.status = status
    db.commit()
