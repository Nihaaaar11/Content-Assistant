"""Manual connector parsing tests."""
from __future__ import annotations

import pytest

from backend.connectors.base import ConnectorError
from backend.connectors.manual import parse_csv, parse_free_text

CSV = """post_id,caption,published_at,likes,comments,views
p1,Launch video,2024-03-15,120,30,5000
p2,Reel about tips,2024-03-18 10:30,80,12,
p3,No metrics row,2024-03-20,,
"""


def test_parse_csv_basic():
    posts = parse_csv(CSV)
    assert len(posts) == 3
    first = posts[0]
    assert first.platform_post_id == "p1"
    assert first.platform == "manual"
    assert first.metrics["likes"] == 120
    assert first.published_at is not None
    assert first.published_at.year == 2024


def test_parse_csv_platform_column():
    csv_text = "post_id,platform,caption\nx1,youtube,Hello\n"
    posts = parse_csv(csv_text)
    assert posts[0].platform == "youtube"


def test_parse_csv_empty_raises():
    with pytest.raises(ConnectorError):
        parse_csv("")


def test_free_text_extract_metrics():
    text = "Behind the scenes reel — likes: 250 comments: 18 views=1.2k 2024-05-01"
    posts = parse_free_text(text)
    p = posts[0]
    assert p.metrics["likes"] == 250
    assert p.metrics["comments"] == 18
    assert p.metrics["views"] == 1200
    assert p.published_at is not None and p.published_at.day == 1
    assert "likes" not in p.caption  # metric tokens removed from caption


def test_free_text_plain_line():
    posts = parse_free_text("Just a normal caption line")
    assert posts[0].caption == "Just a normal caption line"
    assert posts[0].metrics == {}
