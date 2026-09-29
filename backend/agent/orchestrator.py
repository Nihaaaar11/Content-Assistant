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
) -> list[dict[str, str]]:
    system = prompts.ANALYST_SYSTEM_PROMPT + "\n\n" + prompts.TOOL_GUIDANCE
    trimmed = history[-MAX_HISTORY_MESSAGES:]
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    messages.extend(trimmed)
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

        # 1. auto-recall
        yield {"event": "tool", "data": {"status": "Recalling brand memories…"}}
        recall_results = self.memory.recall(brand_id, user_message)
        recall_text = format_recall(recall_results)

        # 2. prompt
        messages = build_messages(history, user_message, recall_text)

        # 3. tool-calling loop
        final_text = ""
        for _ in range(MAX_TOOL_ITERATIONS):
            stream = self.grok.stream(messages, tools=OPENAI_TOOL_SCHEMAS)
            content_parts: list[str] = []
            tool_calls_acc: dict[int, dict[str, Any]] = {}

            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    content_parts.append(delta.content)
                    yield {"event": "token", "data": {"text": delta.content}}
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
            self.memory.retain_chat_turn(
                brand_id,
                user_message,
                final_text or "(no text)",
                datetime.now(timezone.utc).isoformat(),
            )
        except Exception:
            logger.warning("retain_chat_turn failed", exc_info=True)

        yield {"event": "done", "data": {"finish": True}}
