"""Connector registry."""
from __future__ import annotations

from typing import Any

from backend.connectors.base import BaseConnector, ConnectorError, NormalizedPost
from backend.connectors.instagram import InstagramConnector
from backend.connectors.youtube import YouTubeConnector

_CONNECTORS: dict[str, type[BaseConnector]] = {
    "youtube": YouTubeConnector,
    "instagram": InstagramConnector,
}


def get_connector(platform: str, credentials: dict[str, Any]) -> BaseConnector:
    cls = _CONNECTORS.get(platform)
    if cls is None:
        raise ConnectorError(f"No connector for platform '{platform}'")
    return cls(credentials)


__all__ = [
    "BaseConnector",
    "ConnectorError",
    "NormalizedPost",
    "get_connector",
]
