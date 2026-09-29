"""Instagram Graph API connector (Business/Creator account required).

Requires a Meta app with instagram_basic + instagram_manage_insights and an
access token for the linked Facebook Page / Instagram professional account.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from backend.connectors.base import BaseConnector, ConnectorError, NormalizedPost

logger = logging.getLogger(__name__)

GRAPH = "https://graph.facebook.com/v21.0"


def _parse_ig_date(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


class InstagramConnector(BaseConnector):
    platform = "instagram"

    def validate(self) -> None:
        if not self.credentials.get("access_token") or not self.credentials.get("user_id"):
            raise ConnectorError(
                "Instagram not configured: need INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID."
            )

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.credentials['access_token']}"}

    def fetch_recent(self, limit: int = 25) -> list[NormalizedPost]:
        import httpx

        user_id = self.credentials["user_id"]
        with httpx.Client(timeout=30) as http:
            resp = http.get(
                f"{GRAPH}/{user_id}/media",
                params={
                    "fields": "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count",
                    "limit": min(50, max(1, limit)),
                },
                headers=self._headers(),
            )
            if resp.status_code != 200:
                raise ConnectorError(f"Instagram media fetch failed ({resp.status_code}): {resp.text[:200]}")

            posts: list[NormalizedPost] = []
            for item in resp.json().get("data", []):
                posts.append(
                    NormalizedPost(
                        platform="instagram",
                        platform_post_id=item["id"],
                        caption=item.get("caption") or "",
                        url=item.get("permalink") or "",
                        published_at=_parse_ig_date(item.get("timestamp", "")),
                        metrics={
                            "likes": int(item.get("like_count") or 0),
                            "comments": int(item.get("comments_count") or 0),
                        },
                    )
                )

            # Best-effort reach/saves via /insights (needs instagram_manage_insights).
            self._attach_insights(http, user_id, posts)
            return posts

    def _attach_insights(self, http, user_id: str, posts: list[NormalizedPost]) -> None:
        for post in posts:
            try:
                resp = http.get(
                    f"{GRAPH}/{post.platform_post_id}/insights",
                    params={"metric": "reach,saved"},
                    headers=self._headers(),
                )
                if resp.status_code != 200:
                    continue
                for row in resp.json().get("data", []):
                    values = row.get("values") or [{}]
                    post.metrics[row["name"]] = int(values[0].get("value") or 0)
            except Exception:
                logger.debug("insights failed for %s", post.platform_post_id, exc_info=True)

    def followers(self) -> int | None:
        import httpx

        try:
            with httpx.Client(timeout=30) as http:
                resp = http.get(
                    f"{GRAPH}/{self.credentials['user_id']}",
                    params={"fields": "followers_count"},
                    headers=self._headers(),
                )
                if resp.status_code != 200:
                    return None
                return int(resp.json().get("followers_count") or 0) or None
        except Exception:
            return None


def refresh_long_lived_token(access_token: str) -> str | None:
    """Exchange a long-lived token for a fresh one (~60 day validity)."""
    import httpx

    try:
        with httpx.Client(timeout=30) as http:
            resp = http.get(
                f"{GRAPH}/refresh_access_token",
                params={"grant_type": "ig_refresh_token", "access_token": access_token},
            )
            if resp.status_code == 200:
                return resp.json().get("access_token")
    except Exception:
        logger.warning("instagram token refresh failed", exc_info=True)
    return None
