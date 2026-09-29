"""Hindsight client wrapper — one memory bank per brand.

Operations:
- retain:  store posts, analyses, and chat turns (context labels distinguish types)
- recall:  multi-strategy search used to ground chat answers
- reflect: Hindsight's agentic deep reasoning over the whole bank
"""
from __future__ import annotations

import json
import logging
from typing import Any

from hindsight_client import Hindsight

from backend.core.config import settings

logger = logging.getLogger(__name__)

# Context labels used to distinguish retained content types.
CTX_POST = "social-post"
CTX_ANALYSIS = "performance-analysis"
CTX_CHAT = "strategy-chat"

# Retain is async on the server; don't block chat/collection paths.
RETAIN_KWARGS = {"async_processing": True}


def bank_id_for(brand_id: int) -> str:
    return f"brand_{brand_id}"


class HindsightMemory:
    """Thin, testable wrapper around hindsight-client."""

    def __init__(self, base_url: str | None = None) -> None:
        self._client = Hindsight(base_url=base_url or settings.hindsight_url)

    # ---- health --------------------------------------------------------------
    def ping(self) -> bool:
        """True if the Hindsight server answers a light request."""
        try:
            self._client.list_banks(limit=1)
            return True
        except Exception:
            logger.debug("hindsight ping failed", exc_info=True)
            return False

    # ---- banks -------------------------------------------------------------
    def ensure_bank(self, brand_id: int, brand_name: str) -> str:
        """Create the bank if missing and give it an analyst mission."""
        bid = bank_id_for(brand_id)
        mission = (
            f"I am the growth analyst and content strategist for the brand '{brand_name}'. "
            f"I continuously observe its social media content and metrics, and I help "
            f"restructure its content plan based on accumulated evidence. "
            f"Brand homepage: {settings.frontend_url}"
        )
        try:
            self._client.create_bank(
                bank_id=bid,
                name=f"{brand_name} — growth memory",
                mission=mission,
                directives=[
                    "Cite the specific post, date, or metric that supports every claim about performance.",
                    "Separate observations (data-backed) from hypotheses (unverified reasoning).",
                    "Never invent metrics; if data is missing, say what is missing.",
                ],
            )
        except Exception as exc:  # bank may already exist
            logger.debug("create_bank(%s) -> %s", bid, exc)
        return bid

    # ---- retain ------------------------------------------------------------
    def retain_post(
        self,
        brand_id: int,
        post_id: str,
        platform: str,
        caption: str,
        published_at: str,
        metrics: dict[str, Any],
        url: str | None = None,
    ) -> None:
        """Upsert one social post (idempotent via document_id)."""
        lines = [f"PLATFORM: {platform}", f"POSTED: {published_at}"]
        if url:
            lines.append(f"URL: {url}")
        if metrics:
            lines.append(
                "METRICS: " + ", ".join(f"{k}={v}" for k, v in metrics.items())
            )
        lines.append(f"CAPTION: {caption or '(no caption)'}")

        self._client.retain(
            bank_id=bank_id_for(brand_id),
            items=[
                {
                    "content": "\n".join(lines),
                    "context": CTX_POST,
                    "timestamp": published_at,
                    "document_id": f"{platform}-{post_id}",
                    "metadata": {
                        "platform": platform,
                        "post_id": post_id,
                        **({"url": url} if url else {}),
                    },
                }
            ],
            **RETAIN_KWARGS,
        )

    def retain_analysis(
        self, brand_id: int, report: str, analysis_date: str, kind: str = "cycle"
    ) -> None:
        """Store a performance report (cycle report or daily digest)."""
        self._client.retain(
            bank_id=bank_id_for(brand_id),
            items=[
                {
                    "content": report,
                    "context": CTX_ANALYSIS,
                    "timestamp": analysis_date,
                    "document_id": f"analysis-{kind}-{analysis_date[:10]}",
                    "metadata": {"kind": kind, "date": analysis_date[:10]},
                }
            ],
            **RETAIN_KWARGS,
        )

    def retain_chat_turn(
        self, brand_id: int, user_message: str, assistant_reply: str, turn_date: str
    ) -> None:
        """Store a strategy conversation so past advice is recallable."""
        content = (
            f"USER (strategy chat): {user_message}\n"
            f"BRANDPULSE (analyst): {assistant_reply}"
        )
        self._client.retain(
            bank_id=bank_id_for(brand_id),
            items=[
                {
                    "content": content,
                    "context": CTX_CHAT,
                    "timestamp": turn_date,
                    "document_id": f"chat-{turn_date}",
                    "metadata": {"kind": "strategy-chat"},
                }
            ],
            **RETAIN_KWARGS,
        )

    # ---- recall / reflect --------------------------------------------------
    def recall(
        self,
        brand_id: int,
        query: str,
        types: list[str] | None = None,
        budget: str = "mid",
        max_results: int = 20,
    ) -> list[dict[str, Any]]:
        """Multi-strategy memory search; returns normalized dicts."""
        kwargs: dict[str, Any] = {
            "budget": budget,
            "max_results": max_results,
            "prefer_observations": True,
        }
        if types:
            kwargs["types"] = types
        try:
            resp = self._client.recall(
                bank_id=bank_id_for(brand_id), query=query, **kwargs
            )
        except Exception:
            logger.exception("recall failed for bank %s", brand_id)
            return []
        return _normalize_recall(resp)

    def reflect(self, brand_id: int, query: str) -> str:
        """Agentic deep reasoning across the whole bank (slow, use sparingly)."""
        try:
            resp = self._client.reflect(
                bank_id=bank_id_for(brand_id), query=query
            )
        except Exception:
            logger.exception("reflect failed for bank %s", brand_id)
            return ""
        if isinstance(resp, str):
            return resp
        return getattr(resp, "text", "") or str(resp)


def _format_metric_facts(results: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for r in results:
        when = r.get("occurred_start") or r.get("mentioned_at") or ""
        prefix = f"[{when[:10]}] " if when else ""
        ctx = f" ({r['context']})" if r.get("context") else ""
        lines.append(f"- {prefix}{r.get('text', '')}{ctx}")
    return "\n".join(lines)


def _normalize_recall(resp: Any) -> list[dict[str, Any]]:
    items: list[Any] = getattr(resp, "results", None)
    if items is None and isinstance(resp, dict):
        items = resp.get("results", [])
    out: list[dict[str, Any]] = []
    for it in items or []:
        if isinstance(it, dict):
            out.append(it)
        else:
            out.append(
                {
                    "text": getattr(it, "text", ""),
                    "context": getattr(it, "context", ""),
                    "occurred_start": getattr(it, "occurred_start", None),
                    "mentioned_at": getattr(it, "mentioned_at", None),
                    "metadata": getattr(it, "metadata", {}) or {},
                }
            )
    return out


_memory: HindsightMemory | None = None


def get_memory() -> HindsightMemory:
    global _memory
    if _memory is None:
        _memory = HindsightMemory()
    return _memory


def set_memory(mem: HindsightMemory | None) -> None:
    """Test seam."""
    global _memory
    _memory = mem
