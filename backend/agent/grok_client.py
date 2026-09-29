"""Grok (xAI) client built on the OpenAI SDK.

xAI exposes an OpenAI-compatible API at https://api.x.ai/v1, so the stock
`openai` Python SDK works with just a base_url swap.
"""
from __future__ import annotations

from typing import Any

from openai import AsyncOpenAI

from backend.core.config import settings


class GrokClient:
    """Thin wrapper providing chat + streaming + function calling via Gemini or xAI."""

    def __init__(self, api_key: str | None = None, model: str | None = None, provider: str | None = None) -> None:
        import os
        gem_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
        prov = provider or settings.llm_provider
        use_gemini = (prov == "gemini") or (bool(gem_key.strip()) and prov != "grok")
        
        if use_gemini:
            key = api_key or gem_key
            url = "https://generativelanguage.googleapis.com/v1beta/openai/"
            mod = model or settings.gemini_model or "gemini-3.5-flash"
        else:
            key = api_key or settings.xai_api_key or os.environ.get("XAI_API_KEY", "")
            url = "https://api.x.ai/v1"
            mod = model or settings.grok_model or "grok-4-fast"

        self._client = AsyncOpenAI(
            api_key=key or "missing-key",
            base_url=url,
        )
        self.model = mod
        self.is_gemini = use_gemini

    def _ensure_key(self) -> None:
        if not settings.has_llm():
            raise RuntimeError(
                "Neither GEMINI_API_KEY nor XAI_API_KEY is configured in .env."
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
        candidate_models = [self.model]
        if self.is_gemini:
            fallbacks = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.7-flash"]
            for f in fallbacks:
                if f not in candidate_models:
                    candidate_models.append(f)

        kwargs: dict[str, Any] = {
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if tools and not self.is_gemini:
            kwargs["tools"] = tools

        last_exc = None
        for mod in candidate_models:
            try:
                return await self._client.chat.completions.create(model=mod, **kwargs)
            except Exception as exc:
                last_exc = exc
                err_str = str(exc)
                if ("429" in err_str or "503" in err_str or "Quota" in err_str or "UNAVAILABLE" in err_str) and self.is_gemini:
                    continue
                raise exc
        if last_exc:
            raise last_exc

    async def stream(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.4,
        max_tokens: int = 2048,
    ):
        """Return an async iterator of text delta chunks."""
        self._ensure_key()
        candidate_models = [self.model]
        if self.is_gemini:
            fallbacks = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.7-flash"]
            for f in fallbacks:
                if f not in candidate_models:
                    candidate_models.append(f)

        kwargs: dict[str, Any] = {
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        if tools and not self.is_gemini:
            kwargs["tools"] = tools

        resp = None
        last_exc = None
        for mod in candidate_models:
            try:
                resp = await self._client.chat.completions.create(model=mod, **kwargs)
                break
            except Exception as exc:
                last_exc = exc
                err_str = str(exc)
                if ("429" in err_str or "503" in err_str or "Quota" in err_str or "UNAVAILABLE" in err_str) and self.is_gemini:
                    continue
                raise exc

        if resp is None:
            if last_exc:
                raise last_exc
            raise RuntimeError("No model succeeded")

        async for chunk in resp:
            yield chunk

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
