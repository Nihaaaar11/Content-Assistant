"""Built-in native tools available to the agent (registered via @tool)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from backend.analysis.analyzer import rank_posts
from backend.db.models import get_sessionmaker
from backend.db import repo
from backend.memory import hindsight_db
from backend.tools.registry import tool


def _session() -> Session:
    return get_sessionmaker()()


@tool("recall_memory")
async def recall_memory(query: str = "", types: list[str] | None = None, ctx: dict | None = None) -> Any:
    """Search the brand memory bank."""
    brand_id = _brand_id(ctx)
    results = hindsight_db.get_memory().recall(brand_id, query or "brand posts and strategy", types=types)
    if not results:
        return {"note": "No memories matched. The bank may still be collecting data."}
    return [
        {
            "text": r.get("text", ""),
            "type": r.get("type", ""),
            "context": r.get("context", ""),
            "date": (r.get("occurred_start") or r.get("mentioned_at") or "")[:10],
        }
        for r in results[:15]
    ]


@tool("save_memory")
async def save_memory(content: str = "", context: str = "decision", ctx: dict | None = None) -> Any:
    """Store a durable conclusion in the brand bank."""
    brand_id = _brand_id(ctx)
    hindsight_db.get_memory().retain_analysis(
        brand_id,
        content,
        analysis_date=datetime.now(timezone.utc).isoformat(),
        kind=context,
    )
    return {"saved": True, "context": context}


@tool("get_brand_stats")
async def get_brand_stats(ctx: dict | None = None) -> Any:
    """Aggregate numbers straight from the metrics DB."""
    with _session() as session:
        return repo.brand_stats_summary(session, _brand_id(ctx))


@tool("list_recent_posts")
async def list_recent_posts(
    platform: str | None = None, limit: int = 10, ctx: dict | None = None
) -> Any:
    """Recent posts with latest metrics, ranked by engagement for easy scanning."""
    with _session() as session:
        posts = repo.recent_posts_with_metrics(
            session, _brand_id(ctx), limit=max(1, min(int(limit), 30)), platform=platform
        )
    ranked = rank_posts(posts)
    return [
        {
            "platform": p["platform"],
            "published_at": p["published_at"],
            "caption": p["caption"],
            "url": p["url"],
            "metrics": p["metrics"],
            "engagement": p["engagement"],
        }
        for p in ranked
    ]


@tool("deep_reflection")
async def deep_reflection(query: str = "", ctx: dict | None = None) -> Any:
    """Hindsight's agentic reasoning across the whole memory bank."""
    brand_id = _brand_id(ctx)
    answer = hindsight_db.get_memory().reflect(brand_id, query or "brand strategy")
    return {"answer": answer or "Reflection returned nothing (bank may be empty or busy)."}


def _brand_id(ctx: dict | None) -> int:
    if not ctx or "brand_id" not in ctx:
        raise ValueError("No brand context — create/select a brand first.")
    return int(ctx["brand_id"])
