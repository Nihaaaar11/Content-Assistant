"""Analyzer tests — pure metric math."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from backend.analysis.analyzer import (
    build_cycle_report,
    build_digest_prompt,
    engagement_rate,
    engagement_total,
    growth_delta,
    platform_split,
    rank_posts,
    window_metrics,
)


def _post(days_ago, likes, comments, views=0, platform="youtube", caption="A post"):
    now = datetime.now(timezone.utc)
    return {
        "platform": platform,
        "caption": caption,
        "published_at": (now - timedelta(days=days_ago)).isoformat(),
        "metrics": {"likes": likes, "comments": comments, "views": views},
    }


def test_engagement_total_and_rate():
    m = {"likes": 10, "comments": 5, "saves": 2, "shares": 3}
    assert engagement_total(m) == 20
    assert engagement_rate(m, followers=200) == 0.1
    # falls back to views when no followers
    assert engagement_rate({"likes": 10, "views": 100}, followers=None) == 0.1
    assert engagement_rate({"likes": 0}, followers=None) is None


def test_growth_delta():
    cur = {"likes": 150, "views": 0}
    prev = {"likes": 100, "views": 0}
    d = growth_delta(cur, prev)
    assert d["likes"] == 50.0
    assert d["views"] == 0.0  # both zero -> no change
    d2 = growth_delta({"likes": 5}, {"likes": 0})
    assert d2["likes"] == 100.0  # new from zero


def test_window_metrics_filters_old_posts():
    posts = [_post(1, 10, 2), _post(10, 99, 99), _post(0, 5, 1)]
    week = window_metrics(posts, days=7)
    assert len(week) == 2


def test_rank_posts_best_first():
    posts = [_post(2, 5, 1), _post(1, 50, 10), _post(3, 20, 0)]
    ranked = rank_posts(posts)
    assert ranked[0]["metrics"]["likes"] == 50
    assert ranked[0]["engagement"] == 60
    assert ranked[-1]["engagement"] == 6


def test_platform_split():
    posts = [
        _post(1, 10, 5, platform="youtube"),
        _post(2, 7, 3, platform="instagram"),
        _post(3, 1, 1, platform="youtube"),
    ]
    split = platform_split(posts)
    assert split["youtube"]["posts"] == 2
    assert split["youtube"]["engagement"] == 17
    assert split["instagram"]["posts"] == 1


def test_cycle_report_contains_sections():
    posts = [_post(1, 100, 20, views=900, caption="Great tutorial"), _post(2, 3, 0, views=10)]
    report = build_cycle_report("Acme", posts)
    assert "Acme" in report
    assert "Top performers" in report
    assert "Great tutorial" in report
    assert "Platform split" in report


def test_cycle_report_empty():
    report = build_cycle_report("Acme", [])
    assert "no posts" in report


def test_digest_prompt_shape():
    posts = [_post(1, 10, 2)]
    stats = {"followers": 1000}
    payload = build_digest_prompt("Acme", posts, stats)
    assert "Brand: Acme" in payload
    assert "eng=" in payload
