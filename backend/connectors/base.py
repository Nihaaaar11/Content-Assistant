"""Connector abstraction: every platform adapter yields NormalizedPost items.

The rest of the system (SQLite store, Hindsight retention, analyzer) only ever
sees NormalizedPost / MetricPoint, so new platforms are drop-in additions.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class NormalizedPost:
    """Platform-independent representation of one social post + its metrics."""

    platform: str
    platform_post_id: str
    caption: str = ""
    url: str = ""
    published_at: datetime | None = None
    metrics: dict[str, Any] = field(default_factory=dict)

    def metric(self, key: str) -> int:
        try:
            return int(self.metrics.get(key) or 0)
        except (TypeError, ValueError):
            return 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "platform": self.platform,
            "platform_post_id": self.platform_post_id,
            "caption": self.caption,
            "url": self.url,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "metrics": self.metrics,
        }


class ConnectorError(RuntimeError):
    """Raised when a platform API call fails irrecoverably."""


class BaseConnector(ABC):
    """A platform adapter bound to one brand's connected account."""

    platform: str = "base"

    def __init__(self, credentials: dict[str, Any]) -> None:
        self.credentials = credentials or {}

    @abstractmethod
    def fetch_recent(self, limit: int = 25) -> list[NormalizedPost]:
        """Fetch the most recent posts with current metrics."""

    @abstractmethod
    def validate(self) -> None:
        """Raise ConnectorError if credentials are missing/invalid."""

    def refresh_metrics(self, posts: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
        """Optionally refresh metrics for known posts; default: fetch_recent map."""
        by_id = {}
        try:
            for p in self.fetch_recent(limit=50):
                by_id[p.platform_post_id] = p.metrics
        except ConnectorError:
            logger.warning("%s refresh_metrics failed", self.platform, exc_info=True)
        return by_id


def credentials_for(accounts: list, platform: str) -> dict[str, Any]:
    """Pick the stored credentials for a platform from brand accounts."""
    for acct in accounts:
        if acct.platform == platform:
            return acct.credentials or {}
    return {}
