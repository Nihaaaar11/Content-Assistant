"""Manual ingestion: paste text or upload CSV through the same NormalizedPost path.

Accepted CSV columns (header required, order-free):
  platform,post_id,url,caption,published_at,likes,comments,views,shares,saves,reach
platform defaults to "manual" if omitted.
"""
from __future__ import annotations

import csv
import io
import re
from datetime import datetime, timezone
from typing import Any

from backend.connectors.base import ConnectorError, NormalizedPost

INT_FIELDS = ("likes", "comments", "views", "shares", "saves", "reach")

# "2024-03-15" or "2024-03-15 10:30" or ISO-8601
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$")  # noqa: kept for callers


def parse_csv(content: str) -> list[NormalizedPost]:
    """Parse CSV text into normalized posts."""
    reader = csv.DictReader(io.StringIO(content))
    if not reader.fieldnames:
        raise ConnectorError("CSV has no header row.")
    posts: list[NormalizedPost] = []
    for i, row in enumerate(reader):
        post_id = (row.get("post_id") or f"row-{i + 1}").strip()
        metrics = {k: _to_int(row.get(k)) for k in INT_FIELDS if row.get(k) not in (None, "")}
        posts.append(
            NormalizedPost(
                platform=(row.get("platform") or "manual").strip().lower(),
                platform_post_id=post_id,
                caption=row.get("caption") or "",
                url=row.get("url") or "",
                published_at=_parse_date(row.get("published_at")),
                metrics=metrics,
            )
        )
    return posts


def parse_free_text(text: str, platform: str = "manual") -> list[NormalizedPost]:
    """Parse pasted free-form text.

    Each non-empty line becomes one post. Optional inline metrics are picked up
    from key=value or key: value pairs (likes, views, comments...); the rest of
    the line is treated as the caption.
    """
    posts: list[NormalizedPost] = []
    for i, raw in enumerate(line.strip() for line in text.splitlines() if line.strip()):
        metrics: dict[str, Any] = {}
        caption = raw

        for key in INT_FIELDS:
            pattern = re.compile(rf"\b{key}\s*[=:]\s*(\d[\d.,_kKmM]*)", re.IGNORECASE)
            match = pattern.search(caption)
            if match:
                metrics[key] = _parse_loose_int(match.group(1))
                caption = (caption[: match.start()] + caption[match.end():]).strip(" -|,")

        date_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", raw)
        published = None
        if date_match:
            published = _parse_date(date_match.group(1))

        posts.append(
            NormalizedPost(
                platform=platform,
                platform_post_id=f"manual-{i + 1}-{abs(hash(raw)) % 100000}",
                caption=caption or raw,
                url="",
                published_at=published,
                metrics=metrics,
            )
        )
    return posts


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip().replace("T", " ")
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
    ):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _parse_loose_int(raw: str) -> int:
    raw = raw.replace(",", "").replace("_", "").rstrip(".")
    mult = 1
    if raw and raw[-1] in "kK":
        mult, raw = 1_000, raw[:-1]
    elif raw and raw[-1] in "mM":
        mult, raw = 1_000_000, raw[:-1]
    try:
        return int(float(raw) * mult)
    except ValueError:
        return 0


def _to_int(value: Any) -> int:
    try:
        return int(float(str(value).replace(",", "")))
    except (TypeError, ValueError):
        return 0
