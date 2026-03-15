from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
AUDIO_DIR = DATA_DIR / "youtube-audio"
CHUNK_DIR = DATA_DIR / "youtube-audio-chunks"
CHANNEL_DATA_PATH = DATA_DIR / "jahongir-youtube-channel.json"
RAW_OUTPUT_PATH = DATA_DIR / "jahongir-youtube-transcripts.json"
SNIPPET_OUTPUT_PATH = DATA_DIR / "jahongir-youtube-transcript-snippets.json"

FFMPEG_BIN = Path(
    r"C:\Users\kamol\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe"
)
FFPROBE_BIN = FFMPEG_BIN.with_name("ffprobe.exe")


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def split_sentences(text: str) -> list[str]:
    text = normalize_whitespace(text)
    if not text:
        return []
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]


def infer_topics(*parts: str) -> list[str]:
    haystack = normalize_whitespace(" ".join(parts).lower())
    rules = [
        ("education", r"\beducation\b|ta'lim|maktab|school|student|o'quv|universitet|ielts|english"),
        ("entrepreneurship", r"biznes|business|tadbirkor|startup|entrepreneur"),
        ("discipline", r"intizom|discipline|habit|odat|samarador|productivity|vaqt"),
        ("goal_setting", r"maqsad|goal|goals|reja|planning"),
        ("leadership", r"lider|leadership|team|jamoa|xodim|manager"),
        ("systems", r"tizim|system|process|kpi|crm|funnel|conversion"),
        ("sales", r"sales|sotuv|lead|conversion|funnel|varonka"),
        ("modme", r"modme|crm|lms|platform"),
        ("cambridge", r"cambridge|ielts|learning center"),
        ("jahon_school", r"jahon school|jahon|maktab"),
        ("selfmade", r"selfmade"),
        ("networking", r"network|networking|tanish-bilish"),
        ("motivation", r"motivatsiya|motivation|ishonch|confidence"),
        ("reading", r"kitob|book|reading|o'qish"),
        ("career", r"career|kasb|university|universitet|abiturient|talaba"),
        ("life_advice", r"maslahat|advice|hayot|uylanish"),
    ]
    topics = [name for name, pattern in rules if re.search(pattern, haystack)]
    return topics[:8] or ["entrepreneurship"]


def load_channel_data() -> list[dict[str, Any]]:
    payload = json.loads(CHANNEL_DATA_PATH.read_text(encoding="utf-8"))
    return payload["videos"]


def load_existing_raw() -> dict[str, Any]:
    if not RAW_OUTPUT_PATH.exists():
        return {"generated_at": None, "subject": "YouTube transcripts for Jahongir Pulatov", "items": []}
    return json.loads(RAW_OUTPUT_PATH.read_text(encoding="utf-8"))


def save_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def run_command(command: list[str]) -> None:
    subprocess.run(command, check=True)


def download_audio(video: dict[str, Any]) -> Path:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    target = AUDIO_DIR / f"{video['id']}.mp3"
    if target.exists():
        return target

    command = [
        "python",
        "-m",
        "yt_dlp",
        "--ffmpeg-location",
        str(FFMPEG_BIN.parent),
        "-f",
        "bestaudio",
        "-x",
        "--audio-format",
        "mp3",
        "-o",
        str(AUDIO_DIR / "%(id)s.%(ext)s"),
        video["url"],
    ]
    run_command(command)
    return target


def get_duration_seconds(file_path: Path) -> float:
    output = subprocess.check_output(
        [
            str(FFPROBE_BIN),
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(file_path),
        ]
    ).decode("utf-8", "ignore")
    return float(output.strip())


def split_audio(file_path: Path, segment_seconds: int = 1200) -> list[Path]:
    CHUNK_DIR.mkdir(parents=True, exist_ok=True)
    duration = get_duration_seconds(file_path)
    if duration <= segment_seconds:
        return [file_path]

    chunk_prefix = CHUNK_DIR / file_path.stem
    existing = sorted(CHUNK_DIR.glob(f"{file_path.stem}-part-*.mp3"))
    if existing:
        return existing

    command = [
        str(FFMPEG_BIN),
        "-i",
        str(file_path),
        "-f",
        "segment",
        "-segment_time",
        str(segment_seconds),
        "-c",
        "copy",
        str(chunk_prefix) + "-part-%03d.mp3",
    ]
    run_command(command)
    return sorted(CHUNK_DIR.glob(f"{file_path.stem}-part-*.mp3"))


def transcribe_chunk(file_path: Path, api_key: str, model: str) -> str:
    with file_path.open("rb") as handle:
        response = requests.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            data={
                "model": model,
                "prompt": "The speaker is Jahongir Pulatov. The audio is mainly Uzbek with some English business terms and names. Return the transcript in the original spoken language as accurately as possible.",
                "response_format": "text",
            },
            files={"file": (file_path.name, handle, "audio/mpeg")},
            timeout=1800,
        )
    response.raise_for_status()
    return response.text.strip()


def chunk_text(text: str, max_chars: int = 900) -> list[str]:
    sentences = split_sentences(text)
    if not sentences:
        text = normalize_whitespace(text)
        return [text[:max_chars]] if text else []

    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        candidate = sentence if not current else f"{current} {sentence}"
        if len(candidate) <= max_chars:
            current = candidate
            continue
        if current:
            chunks.append(current)
        current = sentence
    if current:
        chunks.append(current)
    return chunks[:5]


def build_summary(video: dict[str, Any], transcript: str) -> str:
    base = normalize_whitespace(video.get("description") or "")
    if not base:
        base = " ".join(split_sentences(transcript)[:2])
    summary = f"{video['title']}. {base}".strip()
    return normalize_whitespace(summary)[:420]


def transcript_to_snippets(video: dict[str, Any], transcript: str, source_file: str) -> list[dict[str, Any]]:
    summary = build_summary(video, transcript)
    topics = infer_topics(video["title"], video.get("description") or "", transcript)
    snippets: list[dict[str, Any]] = []
    for index, excerpt in enumerate(chunk_text(transcript), start=1):
        snippets.append(
            {
                "id": f"youtube-local-{video['id']}-{index}",
                "source_type": "youtube_local_transcript",
                "title": f"YouTube transcript: {video['title']}",
                "topics": topics,
                "summary": summary,
                "excerpt": excerpt,
                "source_file": source_file,
                "source_url": video["url"],
            }
        )
    return snippets


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--video-id", action="append", default=[])
    parser.add_argument("--model", default="gpt-4o-mini-transcribe")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("Missing OPENAI_API_KEY")
    if not CHANNEL_DATA_PATH.exists():
        raise SystemExit("Missing jahongir-youtube-channel.json")
    if not FFMPEG_BIN.exists() or not FFPROBE_BIN.exists():
        raise SystemExit("ffmpeg/ffprobe not found")

    videos = load_channel_data()
    if args.video_id:
        wanted = set(args.video_id)
        videos = [video for video in videos if video["id"] in wanted]
    if args.limit is not None:
        videos = videos[: args.limit]

    raw_payload = load_existing_raw()
    existing_by_id = {item["video_id"]: item for item in raw_payload["items"]}

    for video in videos:
        if video["id"] in existing_by_id and existing_by_id[video["id"]].get("transcript_text"):
            continue

        audio_path = download_audio(video)
        chunks = split_audio(audio_path)
        chunk_transcripts: list[dict[str, str]] = []
        full_transcript_parts: list[str] = []

        for chunk in chunks:
            text = transcribe_chunk(chunk, api_key=api_key, model=args.model)
            chunk_transcripts.append({"file": str(chunk), "transcript": text})
            full_transcript_parts.append(text)

        full_transcript = normalize_whitespace(" ".join(full_transcript_parts))
        existing_by_id[video["id"]] = {
            "video_id": video["id"],
            "title": video["title"],
            "url": video["url"],
            "kind": video.get("kind"),
            "upload_date": video.get("upload_date"),
            "duration_seconds": video.get("duration_seconds"),
            "topics": infer_topics(video["title"], video.get("description") or "", full_transcript),
            "audio_file": str(audio_path),
            "chunk_files": [str(chunk) for chunk in chunks],
            "chunk_transcripts": chunk_transcripts,
            "transcript_text": full_transcript,
        }

        raw_payload["generated_at"] = datetime.now(timezone.utc).isoformat()
        raw_payload["items"] = list(existing_by_id.values())
        save_json(RAW_OUTPUT_PATH, raw_payload)

    raw_items = list(existing_by_id.values())
    raw_items.sort(key=lambda item: (item.get("upload_date") or "", item["title"]))
    raw_payload["generated_at"] = datetime.now(timezone.utc).isoformat()
    raw_payload["items"] = raw_items
    save_json(RAW_OUTPUT_PATH, raw_payload)

    videos_by_id = {video["id"]: video for video in load_channel_data()}

    snippet_items: list[dict[str, Any]] = []
    for item in raw_items:
        video = videos_by_id.get(item["video_id"])
        if not item or not item.get("transcript_text"):
            continue
        if not video:
            continue
        snippet_items.extend(
            transcript_to_snippets(
                video=video,
                transcript=item["transcript_text"],
                source_file=item["audio_file"],
            )
        )

    snippet_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "subject": "Local transcripts generated from Jahongir Pulatov YouTube channel audio",
        "items": snippet_items,
    }
    save_json(SNIPPET_OUTPUT_PATH, snippet_payload)


if __name__ == "__main__":
    main()
