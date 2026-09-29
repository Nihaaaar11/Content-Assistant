"""Grok (xAI) client built on the OpenAI SDK.

xAI exposes an OpenAI-compatible API at https://api.x.ai/v1, so the stock
`openai` Python SDK works with just a base_url swap.
"""
from __future__ import annotations

from typing import Any

from openai import AsyncOpenAI

from backend.core.config import settings


class GrokClient:
    """Thin wrapper providing chat + streaming + function calling via xAI."""

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        self._client = AsyncOpenAI(
            api_key=api_key or settings.xai_api_key,
            base_url="https://api.x.ai/v1",
        )
        self.model = model or settings.grok_model

    def _ensure_key(self) -> None:
        if not settings.has_xai():
            raise RuntimeError(
                "XAI_API_KEY is not set. Copy .env.example to .env and add your key from console.x.ai"
            )

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.4,
        max_tokens: int = 2048,
    ) -> Any:
        """Non-streaming chat completion (used for tool-call turns and digests)."""
        self._ensure_key()
        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools:
            kwargs["tools"] = tools
        return await self._client.chat.completions.create(**kwargs)

    def stream(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.4,
        max_tokens: int = 2048,
    ):
        """Return an async iterator of text delta chunks."""
        self._ensure_key()
        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        if tools:
            kwargs["tools"] = tools
        return self._client.chat.completions.create(**kwargs)

    async def complete_text(self, system: str, user: str, max_tokens: int = 1500) -> str:
        """One-shot helper used by the daily digest job."""
        resp = await self.chat(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""


def get_grok_client() -> GrokClient:
    return GrokClient()
