"""Tool registry: OpenAI function-call schemas + dispatcher."""
from __future__ import annotations

import json
from typing import Any, Awaitable, Callable

# name -> async callable(**args) -> Any (JSON-serializable)
ToolFunc = Callable[..., Awaitable[Any]]

TOOLS: dict[str, ToolFunc] = {}


def tool(name: str) -> Callable[[ToolFunc], ToolFunc]:
    def register(fn: ToolFunc) -> ToolFunc:
        TOOLS[name] = fn
        return fn

    return register


def get_tools() -> dict[str, ToolFunc]:
    # Importing native_tools registers the built-in toolset.
    from backend.tools import native_tools  # noqa: F401

    return TOOLS


OPENAI_TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "recall_memory",
            "description": (
                "Search the brand memory bank (past posts, metrics, analyses, strategy "
                "chats). Use for anything about past performance or previous advice."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Natural language search query."},
                    "types": {
                        "type": "array",
                        "items": {"type": "string", "enum": ["world", "experience", "observation"]},
                        "description": "Optional memory type filter.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "save_memory",
            "description": (
                "Persist a durable conclusion, decision, or revised plan from this "
                "conversation so it is recallable in future chats."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "The fact/decision to remember."},
                    "context": {
                        "type": "string",
                        "description": "Short label, e.g. 'plan-update' or 'decision'.",
                    },
                },
                "required": ["content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_brand_stats",
            "description": "Hard numbers from the metrics DB: totals, followers, top posts.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_recent_posts",
            "description": "List recent posts with their latest stored metrics.",
            "parameters": {
                "type": "object",
                "properties": {
                    "platform": {"type": "string", "description": "Optional platform filter."},
                    "limit": {"type": "integer", "description": "How many posts (default 10)."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "deep_reflection",
            "description": (
                "Slow agentic reasoning across the ENTIRE memory bank (mental models, "
                "observations, facts). Use at most once per answer for broad 'why' questions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The deep question to reason about."}
                },
                "required": ["query"],
            },
        },
    },
]


async def dispatch(name: str, args: dict[str, Any], ctx: dict[str, Any]) -> Any:
    """Run a tool by name with the brand context injected."""
    tools = get_tools()
    fn = tools.get(name)
    if fn is None:
        return {"error": f"Unknown tool '{name}'"}
    try:
        return await fn(ctx=ctx, **args)
    except TypeError:
        # Tool without ctx kwarg
        args.pop("ctx", None)
        return await fn(**args)
    except Exception as exc:  # tool errors must not kill the chat loop
        return {"error": f"{type(exc).__name__}: {exc}"}


def parse_tool_calls(message: Any) -> list[dict[str, Any]]:
    """Extract [{id, name, args}] from an assistant message, if any."""
    calls = getattr(message, "tool_calls", None) or []
    out: list[dict[str, Any]] = []
    for call in calls:
        fn = call.function
        try:
            args = json.loads(fn.arguments or "{}")
        except json.JSONDecodeError:
            args = {}
        out.append({"id": call.id, "name": fn.name, "args": args})
    return out
