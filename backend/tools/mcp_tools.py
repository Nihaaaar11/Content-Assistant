"""Optional stdio MCP (Model Context Protocol) bridge — scaffold, disabled by default.

v1 ships the native toolset above; this module shows how extra local MCP servers
could be attached later. To enable, install `mcp` and wire `load_mcp_tools()`
into `tools/registry.py` at startup.
"""
from __future__ import annotations

import logging
from typing import Any

from backend.core.config import settings

logger = logging.getLogger(__name__)

# Example shape of a config block (future env var: MCP_SERVERS='{"name": {...}}')
EXAMPLE_SERVER_SPEC = {
    "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
    }
}


def mcp_enabled() -> bool:
    """MCP stays opt-in; nothing dials out unless explicitly configured."""
    return bool(getattr(settings, "mcp_servers", "") or False)


async def load_mcp_tools() -> list[dict[str, Any]]:
    """Connect to configured stdio MCP servers and return tool schemas.

    Intentionally unimplemented in v1 — the native tools cover chat needs and
    Hindsight itself can be exposed over MCP by its server.
    """
    if not mcp_enabled():
        logger.info("MCP bridge disabled (no MCP_SERVERS configured).")
        return []
    raise NotImplementedError(
        "MCP bridge is scaffolded but not enabled in v1. Install the `mcp` package "
        "and implement stdio session wiring here."
    )
