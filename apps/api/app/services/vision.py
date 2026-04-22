import base64
import os
import subprocess
from typing import Optional

import anthropic
import boto3
from app.config import settings

FRAMES_TO_SAMPLE = 4


def _extract_keyframes(video_path: str, job_dir: str) -> list[str]:
    """Extract evenly-spaced frames from video."""
    frames_dir = os.path.join(job_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    subprocess.run(
        [
            "ffmpeg", "-y", "-i", video_path,
            "-vf", f"fps=1/{max(1, _get_duration(video_path) // FRAMES_TO_SAMPLE)}",
            "-vframes", str(FRAMES_TO_SAMPLE),
            os.path.join(frames_dir, "frame_%02d.jpg"),
        ],
        check=True,
        capture_output=True,
    )

    return sorted(
        os.path.join(frames_dir, f)
        for f in os.listdir(frames_dir)
        if f.endswith(".jpg")
    )[:FRAMES_TO_SAMPLE]


def _get_duration(video_path: str) -> int:
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", video_path],
        capture_output=True, text=True,
    )
    try:
        return int(float(result.stdout.strip()))
    except (ValueError, AttributeError):
        return 30


def _upload_frame_to_r2(frame_path: str, save_id: str, idx: int) -> str:
    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
    )
    key = f"frames/{save_id}/frame_{idx:02d}.jpg"
    s3.upload_file(frame_path, settings.r2_bucket, key, ExtraArgs={"ContentType": "image/jpeg"})
    return f"{settings.r2_public_url}/{key}"


def describe_frames(video_path: str, job_dir: str, save_id: str) -> list[str]:
    """Extract frames, upload to R2, describe each with Claude vision."""
    frame_paths = _extract_keyframes(video_path, job_dir)
    if not frame_paths:
        return []

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    descriptions = []

    for idx, frame_path in enumerate(frame_paths):
        try:
            _upload_frame_to_r2(frame_path, save_id, idx)
        except Exception:
            pass  # R2 upload failure is non-fatal

        with open(frame_path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")

        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": "image/jpeg", "data": image_data},
                    },
                    {"type": "text", "text": "Describe what you see in this video frame in 1-2 sentences. Focus on the main subject, action, and any visible text."},
                ],
            }],
        )
        descriptions.append(msg.content[0].text)

    return descriptions
