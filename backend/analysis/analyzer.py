"""Performance analysis: engagement rates, growth deltas, per-post verdicts.

Pure functions over repo output dicts — trivially unit-testable, no I/O.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

ENGAGEMENT_KEYS = ("likes", "comments", "saves", "shares")


def engagement_total(metrics: dict[str, int]) -> int:
    return sum(int(metrics.get(k) or 0) for k in ENGAGEMENT_KEYS)


def engagement_rate(metrics: dict[str, int], followers: int | None) -> float | None:
    """Engagement per follower. Falls back to views when followers unknown."""
    if followers and followers > 0:
        return round(engagement_total(metrics) / followers, 4)
    views = int(metrics.get("views") or 0)
    if views > 0:
        return round(engagement_total(metrics) / views, 4)
    return None


def window_metrics(posts: list[dict[str, Any]], days: int, now: datetime | None = None) -> list[dict[str, Any]]:
    """Posts published within the last `days` days."""
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    out = []
    for p in posts:
        pub = _as_utc(p.get("published_at"))
        if pub and pub >= cutoff:
            out.append(p)
    return out


def growth_delta(current: dict[str, int], previous: dict[str, int]) -> dict[str, float]:
    """Percent change per metric, previous -> current."""
    deltas: dict[str, float] = {}
    for key in ("views", "likes", "comments", "saves", "shares", "reach"):
        cur, prev = int(current.get(key) or 0), int(previous.get(key) or 0)
        if prev > 0:
            deltas[key] = round((cur - prev) / prev * 100.0, 1)
        elif cur > 0:
            deltas[key] = 100.0  # new engagement from zero
        else:
            deltas[key] = 0.0
    return deltas


def rank_posts(posts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Attach engagement + rate, return sorted best-first."""
    scored = []
    for p in posts:
        m = p.get("metrics") or {}
        scored.append(
            {
                **p,
                "engagement": engagement_total(m),
                "engagement_rate": engagement_rate(m, p.get("followers")),
            }
        )
    scored.sort(key=lambda x: x["engagement"], reverse=True)
    return scored


def platform_split(posts: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Aggregate engagement totals per platform."""
    split: dict[str, dict[str, Any]] = {}
    for p in posts:
        plat = p.get("platform") or "unknown"
        m = p.get("metrics") or {}
        bucket = split.setdefault(plat, {"posts": 0, "engagement": 0, "views": 0})
        bucket["posts"] += 1
        bucket["engagement"] += engagement_total(m)
        bucket["views"] += int(m.get("views") or 0)
    return split


def build_cycle_report(
    brand_name: str,
    posts: list[dict[str, Any]],
    now: datetime | None = None,
) -> str:
    """Human-readable report over recent posts, written to memory each cycle."""
    now = now or datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    if not posts:
        return (
            f"Performance cycle report for {brand_name} on {date_str}: "
            "no posts with metrics available yet. Waiting for data collection."
        )

    ranked = rank_posts(posts)
    winners = ranked[:3]
    losers = list(reversed(ranked[-3:])) if len(ranked) > 3 else []
    split = platform_split(posts)

    lines = [f"Performance cycle report for {brand_name} — {date_str}."]

    lines.append("Top performers by engagement:")
    for p in winners:
        m = p.get("metrics") or {}
        when = (p.get("published_at") or "unknown date")[:10]
        lines.append(
            f"- [{p.get('platform')}] {when} engagement={p['engagement']} "
            f"(likes={m.get('likes', 0)}, comments={m.get('comments', 0)}, views={m.get('views', 0)}) "
            f"caption: {p.get('caption', '')[:100]}"
        )

    if losers and ranked[0]["engagement"] > 0:
        lines.append("Lowest performers:")
        for p in losers:
            if p["engagement"] >= winners[0]["engagement"]:
                continue
            m = p.get("metrics") or {}
            when = (p.get("published_at") or "unknown date")[:10]
            lines.append(
                f"- [{p.get('platform')}] {when} engagement={p['engagement']} "
                f"(likes={m.get('likes', 0)}, comments={m.get('comments', 0)}) "
                f"caption: {p.get('caption', '')[:100]}"
            )

    lines.append("Platform split:")
    for plat, bucket in split.items():
        avg = bucket["engagement"] // bucket["posts"] if bucket["posts"] else 0
        lines.append(
            f"- {plat}: {bucket['posts']} posts, total engagement={bucket['engagement']}, "
            f"avg per post={avg}, views={bucket['views']}"
        )

    return "\n".join(lines)


def build_digest_prompt(brand_name: str, posts: list[dict[str, Any]], stats: dict[str, Any]) -> str:
    """Compact data payload handed to Grok for the daily digest."""
    ranked = rank_posts(posts)[:15]
    lines = [
        f"Brand: {brand_name}",
        f"Followers (latest known): {stats.get('followers')}",
        f"Posts in window: {len(posts)}",
        "",
        "Recent posts (best first), format: [platform] date | engagement | caption:",
    ]
    for p in ranked:
        when = (p.get("published_at") or "unknown")[:10]
        m = p.get("metrics") or {}
        lines.append(
            f"- [{p.get('platform')}] {when} | eng={p['engagement']} "
            f"views={m.get('views', 0)} likes={m.get('likes', 0)} comments={m.get('comments', 0)} "
            f"| {p.get('caption', '')[:110]}"
        )
    return "\n".join(lines)


def _as_utc(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None
