from __future__ import annotations

import json
import re
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from yt_dlp import YoutubeDL


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
CHANNEL_URL = "https://www.youtube.com/@jakhongir_pulatov_shorts"


@dataclass
class PlaylistEntry:
    video_id: str
    title: str
    url: str
    kind: str


def load_playlist_entries() -> tuple[dict[str, Any], list[PlaylistEntry]]:
    entries: dict[str, PlaylistEntry] = {}
    channel_metadata: dict[str, Any] | None = None

    with YoutubeDL({"skip_download": True, "quiet": True, "extract_flat": True}) as ydl:
        for tab, kind in (("videos", "video"), ("shorts", "short")):
            info = ydl.extract_info(f"{CHANNEL_URL}/{tab}", download=False)
            if channel_metadata is None:
                channel_metadata = {
                    "channel": info.get("channel"),
                    "channel_id": info.get("channel_id"),
                    "uploader": info.get("uploader"),
                    "uploader_id": info.get("uploader_id"),
                    "uploader_url": info.get("uploader_url"),
                    "channel_url": info.get("channel_url"),
                    "description": info.get("description"),
                    "tags": info.get("tags") or [],
                    "channel_follower_count": info.get("channel_follower_count"),
                }

            for item in info.get("entries") or []:
                video_id = item.get("id")
                if not video_id:
                    continue
                entries[video_id] = PlaylistEntry(
                    video_id=video_id,
                    title=item.get("title") or "",
                    url=item.get("url") or f"https://www.youtube.com/watch?v={video_id}",
                    kind=kind,
                )

    return channel_metadata or {}, list(entries.values())


def fetch_json(url: str) -> Any:
    with urllib.request.urlopen(url, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def choose_caption_track(info: dict[str, Any]) -> tuple[str | None, str | None]:
    automatic = info.get("automatic_captions") or {}
    subtitles = info.get("subtitles") or {}
    for lang in ("tr-orig", "uz-orig", "en-orig", "tr", "uz", "en"):
        tracks = automatic.get(lang)
        if tracks:
            for track in tracks:
                if track.get("ext") == "json3":
                    return track.get("url"), f"automatic_caption:{lang}"
    for lang in ("tr-orig", "uz-orig", "en-orig", "tr", "uz", "en"):
        tracks = subtitles.get(lang)
        if tracks:
            for track in tracks:
                if track.get("ext") == "json3":
                    return track.get("url"), f"subtitle:{lang}"
    return None, None


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def extract_transcript_text(caption_url: str | None) -> str:
    if not caption_url:
        return ""

    try:
        data = fetch_json(caption_url)
    except Exception:
        return ""

    lines: list[str] = []
    for event in data.get("events") or []:
        segs = event.get("segs")
        if not segs:
            continue
        text = "".join(seg.get("utf8", "") for seg in segs)
        text = normalize_whitespace(text.replace("\n", " "))
        if text:
            lines.append(text)

    transcript = normalize_whitespace(" ".join(lines))
    return transcript


def clean_description(description: str | None) -> str:
    if not description:
        return ""
    text = description.replace("\r", "\n")
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"(?im)^(instagram|telegram|facebook|youtube|aloqa|bog'lanish).*?$", "", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return normalize_whitespace(text)


def infer_topics(*parts: str) -> list[str]:
    haystack = normalize_whitespace(" ".join(parts).lower())
    topic_rules = [
        ("education", r"\beducation\b|ta'lim|maktab|school|student|o'quv|universitet|ielts|english"),
        ("entrepreneurship", r"biznes|business|tadbirkor|startup|entrepreneur"),
        ("discipline", r"intizom|discipline|habit|odat|samarador|productivity|vaqt"),
        ("goal_setting", r"maqsad|goal|goals|reja|planning"),
        ("leadership", r"lider|leadership|team|jamoa|xodim|manager"),
        ("systems", r"tizim|system|process|kpi|crm|funnel|conversion"),
        ("sales", r"sales|sotuv|lead|conversion|funnel"),
        ("modme", r"modme|crm|lms|platform"),
        ("cambridge", r"cambridge|ielts|learning center"),
        ("jahon_school", r"jahon school|jahon|maktab"),
        ("selfmade", r"selfmade"),
        ("networking", r"network|networking|tanish-bilish"),
        ("motivation", r"motivatsiya|motivation|ishonch|confidence"),
        ("reading", r"kitob|book|reading|o'qish"),
        ("career", r"career|kasb|university|universitet"),
        ("life_advice", r"maslahat|advice|uylanish|hayot"),
    ]
    topics = [name for name, pattern in topic_rules if re.search(pattern, haystack)]
    return topics[:8] or ["entrepreneurship"]


def split_sentences(text: str) -> list[str]:
    text = normalize_whitespace(text)
    if not text:
        return []
    return [sentence.strip() for sentence in re.split(r"(?<=[.!?])\s+", text) if sentence.strip()]


def chunk_text(text: str, max_chars: int = 900) -> list[str]:
    sentences = split_sentences(text)
    if not sentences:
        return []

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
    return chunks[:4]


def build_summary(title: str, description: str, transcript: str, chapters: list[str]) -> str:
    opening = split_sentences(description)[:2]
    if not opening:
        opening = split_sentences(transcript)[:2]
    detail = ", ".join(chapters[:3]) if chapters else ""
    summary = f"{title}. {' '.join(opening)}".strip()
    if detail:
        summary = f"{summary} Main sections include {detail}."
    return normalize_whitespace(summary)[:420]


def build_segments(chapters: list[str], transcript: str) -> list[str]:
    if chapters:
        return chapters[:6]
    return split_sentences(transcript)[:4]


def build_video_snippets(video: dict[str, Any]) -> list[dict[str, Any]]:
    title = video["title"]
    description = video["description"]
    transcript = video["transcript_text"]
    chapters = [chapter["title"] for chapter in video["chapters"]]
    source_url = video["url"]
    base_topics = infer_topics(title, description, transcript, " ".join(chapters))
    summary = build_summary(title, description, transcript, chapters)

    snippets: list[dict[str, Any]] = []
    if transcript:
        for index, chunk in enumerate(chunk_text(transcript), start=1):
            snippets.append(
                {
                    "id": f"youtube-{video['id']}-{index}",
                    "source_type": "youtube_transcript",
                    "title": title,
                    "topics": base_topics,
                    "summary": summary,
                    "excerpt": chunk,
                    "segments": build_segments(chapters, chunk),
                    "source_url": source_url,
                }
            )
        return snippets

    snippets.append(
        {
            "id": f"youtube-{video['id']}",
            "source_type": "youtube_outline",
            "title": title,
            "topics": base_topics,
            "summary": summary,
            "excerpt": description[:900],
            "segments": build_segments(chapters, description),
            "source_url": source_url,
        }
    )
    return snippets


def fetch_video_info(entry: PlaylistEntry) -> dict[str, Any]:
    with YoutubeDL({"skip_download": True, "quiet": True}) as ydl:
        info = ydl.extract_info(entry.url, download=False)

    caption_url, transcript_source = choose_caption_track(info)
    transcript_text = extract_transcript_text(caption_url)
    description = clean_description(info.get("description"))

    chapters = [
        {"title": chapter.get("title"), "start_time": chapter.get("start_time")}
        for chapter in (info.get("chapters") or [])
        if chapter.get("title")
    ]

    return {
        "id": info.get("id") or entry.video_id,
        "kind": entry.kind,
        "title": info.get("title") or entry.title,
        "url": info.get("webpage_url") or entry.url,
        "upload_date": info.get("upload_date"),
        "duration_seconds": info.get("duration"),
        "view_count": info.get("view_count"),
        "description": description,
        "topics": infer_topics(entry.title, description),
        "chapters": chapters,
        "transcript_source": transcript_source,
        "transcript_available": bool(transcript_text),
        "transcript_text": transcript_text,
    }


def main() -> None:
    channel_metadata, playlist_entries = load_playlist_entries()
    videos = [fetch_video_info(entry) for entry in playlist_entries]

    videos.sort(key=lambda item: (item.get("kind") != "video", item.get("upload_date") or "", item["title"]))

    raw_payload = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "subject": "Jakhongir Pulatov YouTube channel data",
        "channel": channel_metadata,
        "videos": videos,
    }

    snippets = []
    for video in videos:
        snippets.extend(build_video_snippets(video))

    snippet_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "subject": "Jahongir Pulatov YouTube transcript and outline snippets",
        "items": snippets,
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "jahongir-youtube-channel.json").write_text(
        json.dumps(raw_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (DATA_DIR / "jahongir-youtube-snippets.json").write_text(
        json.dumps(snippet_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
