import subprocess
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path


@dataclass
class DownloadResult:
    video_path: str
    audio_path: str
    title: str
    description: str
    duration_secs: int
    thumbnail_url: str
    platform: str


def _detect_platform(url: str) -> str:
    if "tiktok.com" in url:
        return "tiktok"
    if "instagram.com" in url:
        return "instagram"
    return "unknown"


def download_video(url: str, job_dir: str) -> DownloadResult:
    platform = _detect_platform(url)
    video_path = os.path.join(job_dir, "video.mp4")
    audio_path = os.path.join(job_dir, "audio.mp3")
    info_path = os.path.join(job_dir, "info.json")

    subprocess.run(
        [
            "yt-dlp",
            "--no-playlist",
            "--write-info-json",
            "--output", video_path,
            "--format", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            url,
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    # Extract audio with ffmpeg
    subprocess.run(
        ["ffmpeg", "-y", "-i", video_path, "-vn", "-ar", "16000", "-ac", "1", "-b:a", "64k", audio_path],
        check=True,
        capture_output=True,
    )

    # Parse info JSON (yt-dlp writes <output>.info.json)
    import json
    info_file = video_path.replace(".mp4", ".info.json")
    if not os.path.exists(info_file):
        # fallback: search for any .info.json
        for f in os.listdir(job_dir):
            if f.endswith(".info.json"):
                info_file = os.path.join(job_dir, f)
                break

    title = ""
    description = ""
    duration_secs = 0
    thumbnail_url = ""

    if os.path.exists(info_file):
        with open(info_file) as f:
            info = json.load(f)
        title = info.get("title") or info.get("fulltitle", "")
        description = info.get("description", "")
        duration_secs = int(info.get("duration") or 0)
        thumbnail_url = info.get("thumbnail", "")

    return DownloadResult(
        video_path=video_path,
        audio_path=audio_path,
        title=title,
        description=description,
        duration_secs=duration_secs,
        thumbnail_url=thumbnail_url,
        platform=platform,
    )
