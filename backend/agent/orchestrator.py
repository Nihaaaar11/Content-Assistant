"""The orchestrator: memory-grounded Grok reasoning loop with SSE streaming.

Flow per user message:
  1. recall brand memories relevant to the message
  2. build system + memory + history prompt
  3. Grok function-calling loop (bounded iterations)
  4. stream final answer as SSE events: tool -> token -> done
  5. retain the turn into the brand bank
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from backend.agent import prompts
from backend.agent.grok_client import GrokClient
from backend.memory import hindsight_db
from backend.tools.registry import OPENAI_TOOL_SCHEMAS, dispatch, get_tools, parse_tool_calls

logger = logging.getLogger(__name__)

MAX_TOOL_ITERATIONS = 6
MAX_HISTORY_MESSAGES = 12


def format_recall(results: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for r in results:
        when = r.get("occurred_start") or r.get("mentioned_at") or ""
        prefix = f"[{when[:10]}] " if when else ""
        ctx = f" ({r.get('context')})" if r.get("context") else ""
        lines.append(f"- {prefix}{r.get('text', '')}{ctx}")
    return "\n".join(lines)


def build_messages(
    history: list[dict[str, str]],
    user_message: str,
    recall_text: str,
    is_gemini: bool = False,
) -> list[dict[str, str]]:
    system = prompts.ANALYST_SYSTEM_PROMPT
    if not is_gemini:
        system += "\n\n" + prompts.TOOL_GUIDANCE
    trimmed = history[-MAX_HISTORY_MESSAGES:]
    clean_history = [
        {"role": m["role"], "content": m["content"]}
        for m in trimmed
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    messages.extend(clean_history)
    user_block = prompts.build_memory_block(recall_text) + user_message
    messages.append({"role": "user", "content": user_block})
    return messages


class Orchestrator:
    def __init__(self, grok: GrokClient | None = None, memory: hindsight_db.HindsightMemory | None = None):
        self.grok = grok or GrokClient()
        self.memory = memory or hindsight_db.get_memory()

    async def run(
        self,
        brand_id: int,
        brand_name: str,
        user_message: str,
        history: list[dict[str, str]] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Yield SSE-ready events: {event: 'token'|'tool'|'done'|'error', data: ...}."""
        history = history or []
        ctx = {"brand_id": brand_id, "brand_name": brand_name}

        # 1. auto-recall & pre-fetch DB stats
        yield {"event": "tool", "data": {"status": "Recalling brand memories & stats…"}}
        if hasattr(self.memory, "arecall"):
            recall_results = await self.memory.arecall(brand_id, user_message)
        else:
            recall_results = self.memory.recall(brand_id, user_message)
        recall_text = format_recall(recall_results)

        try:
            from backend.db.models import get_sessionmaker
            from backend.db import repo
            with get_sessionmaker()() as session:
                stats = repo.brand_stats_summary(session, brand_id)
                if stats and (stats.get("post_count", 0) > 0 or stats.get("followers")):
                    stats_str = f"\n\n[Brand Metrics & Recent Posts]\n" \
                                f"- Total Posts: {stats.get('post_count', 0)}\n" \
                                f"- Followers: {stats.get('followers') or 'N/A'}\n" \
                                f"- Total Likes: {stats.get('total_likes', 0)}\n" \
                                f"- Total Comments: {stats.get('total_comments', 0)}\n" \
                                f"- Total Views: {stats.get('total_views', 0)}\n"
                    if stats.get("top_posts"):
                        stats_str += "- Top Performing Posts:\n"
                        for tp in stats["top_posts"]:
                            m = tp.get("metrics") or {}
                            stats_str += f"  * [{tp.get('platform')}] \"{tp.get('caption')}\" (Likes: {m.get('likes', 0)}, Comments: {m.get('comments', 0)}, Views: {m.get('views', 0)})\n"
                    recall_text += stats_str
        except Exception as e:
            logger.warning(f"Could not pre-fetch brand stats: {e}")

        # 2. prompt
        messages = build_messages(history, user_message, recall_text, is_gemini=getattr(self.grok, "is_gemini", False))

        # 3. response generation
        final_text = ""
        if getattr(self.grok, "is_gemini", False):
            # For Gemini, context (stats + memories) is fully injected into prompt. Stream 1 single turn directly.
            content_parts: list[str] = []
            async for chunk in self.grok.stream(messages, tools=None):
                if not chunk.choices:
                    continue
                delta = getattr(chunk.choices[0], "delta", None)
                text_part = (getattr(delta, "content", None) or "") if delta else ""
                if not text_part and getattr(chunk.choices[0], "text", None):
                    text_part = getattr(chunk.choices[0], "text", "") or ""
                if text_part:
                    content_parts.append(text_part)
                    yield {"event": "token", "data": {"text": text_part}}
            final_text = "".join(content_parts)
        else:
            # Multi-iteration tool loop for Grok / standard OpenAI providers
            tools_to_pass = OPENAI_TOOL_SCHEMAS
            for _ in range(MAX_TOOL_ITERATIONS):
                stream = self.grok.stream(messages, tools=tools_to_pass)
                content_parts: list[str] = []
                tool_calls_acc: dict[int, dict[str, Any]] = {}

                async for chunk in stream:
                    if not chunk.choices:
                        continue
                    delta = getattr(chunk.choices[0], "delta", None)
                    text_part = (getattr(delta, "content", None) or "") if delta else ""
                    if not text_part and getattr(chunk.choices[0], "text", None):
                        text_part = getattr(chunk.choices[0], "text", "") or ""
                    if text_part:
                        content_parts.append(text_part)
                        yield {"event": "token", "data": {"text": text_part}}
                    if delta and getattr(delta, "tool_calls", None):
                        for tc in delta.tool_calls:
                            slot = tool_calls_acc.setdefault(
                                tc.index, {"id": tc.id or "", "name": "", "arguments": ""}
                            )
                            if tc.id:
                                slot["id"] = tc.id
                            if tc.function and tc.function.name:
                                slot["name"] = tc.function.name
                            if tc.function and tc.function.arguments:
                                slot["arguments"] += tc.function.arguments

                content = "".join(content_parts)
                tool_calls = [tool_calls_acc[i] for i in sorted(tool_calls_acc)] if tool_calls_acc else []

                if not tool_calls:
                    final_text = content
                    break

                # execute tools, feed results back
                messages.append(
                    {
                        "role": "assistant",
                        "content": content or None,
                        "tool_calls": [
                            {
                                "id": tc["id"] or f"call_{i}",
                                "type": "function",
                                "function": {"name": tc["name"], "arguments": tc["arguments"] or "{}"},
                            }
                            for i, tc in enumerate(tool_calls)
                        ],
                    }
                )
                for i, tc in enumerate(tool_calls):
                    try:
                        args = json.loads(tc["arguments"] or "{}")
                    except json.JSONDecodeError:
                        args = {}
                    yield {"event": "tool", "data": {"status": f"Using {tc['name']}…", "name": tc["name"]}}
                    result = await dispatch(tc["name"], args, ctx)
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc["id"] or f"call_{i}",
                            "content": json.dumps(result, default=str)[:6000],
                        }
                    )
            else:
                final_text = content or "I hit my tool-use limit mid-analysis — please rephrase."

        # 4. persist the turn into memory
        try:
            if hasattr(self.memory, "aretain_chat_turn"):
                await self.memory.aretain_chat_turn(
                    brand_id,
                    user_message,
                    final_text or "(no text)",
                    datetime.now(timezone.utc).isoformat(),
                )
            else:
                self.memory.retain_chat_turn(
                    brand_id,
                    user_message,
                    final_text or "(no text)",
                    datetime.now(timezone.utc).isoformat(),
                )
        except Exception:
            logger.warning("retain_chat_turn failed", exc_info=True)

        yield {"event": "done", "data": {"finish": True}}
