"""YouTube Data API v3 connector (OAuth for own channel, API-key fallback).

OAuth (YOUTUBE_CLIENT_ID/SECRET + refresh token):
  - channel -> uploads playlist -> videos.list for snippet + statistics

API key (YOUTUBE_API_KEY):
  - same pipeline for public data only; good fallback without OAuth setup.

Refresh token can be obtained once via:  python -m connectors.youtube_auth
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from backend.connectors.base import BaseConnector, ConnectorError, NormalizedPost

logger = logging.getLogger(__name__)

API_BASE = "https://www.googleapis.com/youtube/v3"
TOKEN_URL = "https://oauth2.googleapis.com/token"


def _parse_yt_date(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


class YouTubeConnector(BaseConnector):
    platform = "youtube"

    def __init__(self, credentials: dict[str, Any]) -> None:
        super().__init__(credentials)
        self._access_token: str | None = None

    # ---- auth --------------------------------------------------------------
    def _mode(self) -> str:
        if self.credentials.get("refresh_token") or self.credentials.get("client_id"):
            return "oauth"
        if self.credentials.get("api_key"):
            return "api_key"
        return "none"

    def validate(self) -> None:
        if self._mode() == "none":
            raise ConnectorError(
                "YouTube not configured: need OAuth (client id/secret + refresh token) or an API key."
            )

    def _oauth_access_token(self, http) -> str:
        if self._access_token:
            return self._access_token
        resp = http.post(
            TOKEN_URL,
            data={
                "client_id": self.credentials.get("client_id", ""),
                "client_secret": self.credentials.get("client_secret", ""),
                "refresh_token": self.credentials.get("refresh_token", ""),
                "grant_type": "refresh_token",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp.status_code != 200:
            raise ConnectorError(f"YouTube token refresh failed ({resp.status_code}): {resp.text[:200]}")
        self._access_token = resp.json()["access_token"]
        return self._access_token

    def _channel(self, http) -> dict[str, Any]:
        if self._mode() == "oauth":
            headers = {"Authorization": f"Bearer {self._oauth_access_token(http)}"}
            resp = http.get(f"{API_BASE}/channels", params={"part": "contentDetails,snippet,statistics", "mine": "true"}, headers=headers)
        else:
            handle = self.credentials.get("handle", "")
            params: dict[str, Any] = {"part": "contentDetails,snippet,statistics"}
            if handle:
                params["forHandle"] = handle
            elif self.credentials.get("channel_id"):
                params["id"] = self.credentials["channel_id"]
            else:
                params["mine"] = "true"
            params["key"] = self.credentials.get("api_key", "")
            resp = http.get(f"{API_BASE}/channels", params=params)
        if resp.status_code != 200:
            raise ConnectorError(f"YouTube channels.list failed ({resp.status_code}): {resp.text[:200]}")
        items = resp.json().get("items", [])
        if not items:
            raise ConnectorError("YouTube channel not found for the given credentials.")
        return items[0]

    # ---- fetch -------------------------------------------------------------
    def fetch_recent(self, limit: int = 25) -> list[NormalizedPost]:
        import httpx

        with httpx.Client(timeout=30) as http:
            channel = self._channel(http)
            uploads_playlist = (
                channel.get("contentDetails", {})
                .get("relatedPlaylists", {})
                .get("uploads", "")
            )
            if not uploads_playlist:
                raise ConnectorError("YouTube channel has no uploads playlist.")
            return self._fetch_playlist(http, uploads_playlist, limit)

    def _fetch_playlist(self, http, uploads_playlist: str, limit: int) -> list[NormalizedPost]:
        params: dict[str, Any] = {
            "part": "contentDetails",
            "playlistId": uploads_playlist,
            "maxResults": min(50, max(1, limit)),
        }
        if self._mode() == "api_key":
            params["key"] = self.credentials.get("api_key", "")
        headers = (
            {"Authorization": f"Bearer {self._oauth_access_token(http)}"}
            if self._mode() == "oauth"
            else {}
        )
        resp = http.get(f"{API_BASE}/playlistItems", params=params, headers=headers)
        if resp.status_code != 200:
            raise ConnectorError(f"YouTube playlistItems failed ({resp.status_code}): {resp.text[:200]}")

        video_ids = [
            item["contentDetails"]["videoId"]
            for item in resp.json().get("items", [])
            if item.get("contentDetails", {}).get("videoId")
        ]
        if not video_ids:
            return []
        return self._fetch_video_details(http, video_ids)

    def _fetch_video_details(self, http, video_ids: list[str]) -> list[NormalizedPost]:
        params: dict[str, Any] = {
            "part": "snippet,statistics",
            "id": ",".join(video_ids[:50]),
        }
        if self._mode() == "api_key":
            params["key"] = self.credentials.get("api_key", "")
        headers = (
            {"Authorization": f"Bearer {self._oauth_access_token(http)}"}
            if self._mode() == "oauth"
            else {}
        )
        resp = http.get(f"{API_BASE}/videos", params=params, headers=headers)
        if resp.status_code != 200:
            raise ConnectorError(f"YouTube videos.list failed ({resp.status_code}): {resp.text[:200]}")

        posts: list[NormalizedPost] = []
        for item in resp.json().get("items", []):
            vid = item.get("id", "")
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})
            posts.append(
                NormalizedPost(
                    platform="youtube",
                    platform_post_id=vid,
                    caption=snippet.get("title", "") + (f"\n\n{snippet.get('description', '')[:500]}" if snippet.get("description") else ""),
                    url=f"https://www.youtube.com/watch?v={vid}",
                    published_at=_parse_yt_date(snippet.get("publishedAt", "")),
                    metrics={
                        "views": _to_int(stats.get("viewCount")),
                        "likes": _to_int(stats.get("likeCount")),
                        "comments": _to_int(stats.get("commentCount")),
                    },
                )
            )
        return posts

    def followers(self) -> int | None:
        import httpx

        try:
            with httpx.Client(timeout=30) as http:
                stats = self._channel(http).get("statistics", {})
                return _to_int(stats.get("subscriberCount")) or None
        except ConnectorError:
            return None


def _to_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0
