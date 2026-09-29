"""Memory formatting, tool registry, and repo tests."""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from backend.agent.orchestrator import format_recall
from backend.memory.hindsight_db import _normalize_recall, bank_id_for
from backend.tools.registry import get_tools, dispatch


def test_bank_id():
    assert bank_id_for(7) == "brand_7"


def test_normalize_recall_object_and_dict():
    obj = SimpleNamespace(
        results=[
            SimpleNamespace(
                text="Post X got 300 likes",
                context="social-post",
                occurred_start="2024-03-15T10:00:00Z",
                mentioned_at=None,
                metadata={"platform": "youtube"},
            )
        ]
    )
    out = _normalize_recall(obj)
    assert out[0]["text"] == "Post X got 300 likes"
    assert out[0]["metadata"]["platform"] == "youtube"

    out2 = _normalize_recall({"results": [{"text": "raw dict"}]})
    assert out2[0]["text"] == "raw dict"


def test_format_recall():
    results = [
        {"text": "Reels outperform static", "context": "performance-analysis", "occurred_start": "2024-04-01T00:00:00Z"},
        {"text": "No date fact", "context": "", "occurred_start": None, "mentioned_at": None},
    ]
    formatted = format_recall(results)
    assert "- [2024-04-01] Reels outperform static (performance-analysis)" in formatted
    assert "- No date fact" in formatted


def test_all_native_tools_registered():
    tools = get_tools()
    for name in ("recall_memory", "save_memory", "get_brand_stats", "list_recent_posts", "deep_reflection"):
        assert name in tools, f"{name} missing"


def test_dispatch_unknown_tool():
    result = asyncio.run(dispatch("nope", {}, {"brand_id": 1}))
    assert "error" in result


def test_dispatch_requires_brand_ctx():
    result = asyncio.run(dispatch("get_brand_stats", {}, {}))
    assert "error" in result


def test_repo_upsert_post_and_stats(db_session):
    from backend.db import repo

    brand = repo.create_brand(db_session, "Acme")
    db_session.flush()

    p1 = repo.upsert_post(
        db_session, brand.id, "youtube", "v1",
        url="http://yt/v1", caption="First",
        published_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    # idempotent upsert
    p1_again = repo.upsert_post(db_session, brand.id, "youtube", "v1", caption="First!")
    assert p1.id == p1_again.id
    assert p1_again.caption == "First!"

    repo.add_snapshot(db_session, p1.id, {"likes": 10, "comments": 5, "views": 100, "followers": 500})
    repo.add_snapshot(db_session, p1.id, {"likes": 20, "comments": 8, "views": 200, "followers": 520})

    latest = repo.latest_snapshot(db_session, p1.id)
    assert latest.likes == 20

    stats = repo.brand_stats_summary(db_session, brand.id)
    assert stats["post_count"] == 1
    assert stats["total_likes"] == 20
    assert stats["followers"] == 520
    assert stats["top_posts"][0]["engagement"] == 28

    posts = repo.recent_posts_with_metrics(db_session, brand.id)
    assert posts[0]["metrics"]["views"] == 200
