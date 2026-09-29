"""Pydantic API schemas."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""


class BrandOut(BaseModel):
    id: int
    name: str
    description: str
    platforms: list[str] = []


class ConnectRequest(BaseModel):
    platform: str  # youtube | instagram
    handle: str = ""
    credentials: dict[str, str] = Field(default_factory=dict)


class ConnectOut(BaseModel):
    ok: bool
    platform: str
    message: str = ""


class IngestOut(BaseModel):
    ok: bool
    new_posts: int = 0
    refreshed: int = 0
    errors: list[str] = []
    report: str = ""


class ManualIngestRequest(BaseModel):
    csv_text: str = Field(min_length=1)


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    brand_id: int
    message: str = Field(min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)


class StatsOut(BaseModel):
    post_count: int = 0
    total_likes: int = 0
    total_comments: int = 0
    total_views: int = 0
    followers: int | None = None
    top_posts: list[dict[str, Any]] = []


class PostOut(BaseModel):
    id: int
    platform: str
    post_id: str
    url: str
    caption: str
    published_at: str | None = None
    metrics: dict[str, int] | None = None


class HealthOut(BaseModel):
    status: str
    hindsight: bool
    grok_configured: bool
    scheduler: bool = False
