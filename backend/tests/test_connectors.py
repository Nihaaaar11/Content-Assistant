"""Platform connector tests with mocked HTTP (respx)."""
from __future__ import annotations

import httpx
import pytest
import respx

from backend.connectors import get_connector
from backend.connectors.base import ConnectorError
from backend.connectors.instagram import InstagramConnector
from backend.connectors.youtube import YouTubeConnector


@respx.mock
def test_youtube_api_key_fetch():
    respx.get("https://www.googleapis.com/youtube/v3/channels").respond(
        json={
            "items": [
                {
                    "contentDetails": {"relatedPlaylists": {"uploads": "UU123"}},
                    "snippet": {"title": "Test channel"},
                    "statistics": {"subscriberCount": "900"},
                }
            ]
        }
    )
    respx.get("https://www.googleapis.com/youtube/v3/playlistItems").respond(
        json={"items": [{"contentDetails": {"videoId": "v1"}}]}
    )
    respx.get("https://www.googleapis.com/youtube/v3/videos").respond(
        json={
            "items": [
                {
                    "id": "v1",
                    "snippet": {"title": "My video", "publishedAt": "2024-03-15T10:00:00Z"},
                    "statistics": {"viewCount": "1000", "likeCount": "100", "commentCount": "10"},
                }
            ]
        }
    )

    conn = get_connector("youtube", {"api_key": "AIza-test"})
    posts = conn.fetch_recent(limit=5)

    assert len(posts) == 1
    assert posts[0].platform_post_id == "v1"
    assert posts[0].metrics["views"] == 1000
    assert posts[0].published_at is not None
    assert conn.followers() == 900


def test_youtube_requires_credentials():
    conn = YouTubeConnector({})
    with pytest.raises(ConnectorError):
        conn.validate()


@respx.mock
def test_instagram_fetch_with_insights():
    respx.get("https://graph.facebook.com/v21.0/ig123/media").respond(
        json={
            "data": [
                {
                    "id": "m1",
                    "caption": "New drop",
                    "permalink": "https://instagram.com/p/m1",
                    "timestamp": "2024-03-15T09:00:00+0000",
                    "like_count": 42,
                    "comments_count": 7,
                }
            ]
        }
    )
    respx.get("https://graph.facebook.com/v21.0/m1/insights").respond(
        json={"data": [{"name": "reach", "values": [{"value": 3000}]}]}
    )

    conn = get_connector("instagram", {"access_token": "tok", "user_id": "ig123"})
    posts = conn.fetch_recent(limit=5)

    assert posts[0].metrics["likes"] == 42
    assert posts[0].metrics["reach"] == 3000


def test_instagram_requires_config():
    conn = InstagramConnector({})
    with pytest.raises(ConnectorError):
        conn.validate()
