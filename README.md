# BrandPulse — Grok × Hindsight Content-Strategy Agent

An AI agent that **observes your brand's social media content**, analyzes what's making you
grow (and what isn't), **remembers everything in Hindsight**, and then helps you restructure
your content plan in a chat — grounded in the data it actually collected.

```
Next.js chat UI (app/)  ⇄  FastAPI backend  ⇄  Grok (xAI, api.x.ai/v1)
                              ⇄  Hindsight memory server (:8888, retain/recall/reflect)
                              ⇄  YouTube Data API + Instagram Graph API
                              ⇄  APScheduler (auto-collect → analyze → retain)
```

## How it works

- **Two storage layers.** SQLite keeps precise metric time-series (posts + snapshots) for
  growth math; Hindsight keeps semantic memory (post facts, cycle reports, daily digests,
  strategy chats) as one memory bank per brand (`brand_<id>`).
- **Grok powers everything.** The chat agent, its tool-calling loop, and Hindsight's
  internal fact-extraction/consolidation all use your single `XAI_API_KEY`.
- **Automated observation.** Every `COLLECTION_INTERVAL_HOURS` (default 6) the scheduler
  pulls new posts + fresh metrics per connected platform, stores snapshots, retains new
  facts into memory, and writes a cycle report. A deeper **daily digest** is written daily
  by Grok into memory.
- **Grounded chat.** Each message triggers a memory recall; Grok can then call tools
  (`recall_memory`, `get_brand_stats`, `list_recent_posts`, `deep_reflection`,
  `save_memory`) before answering, and the turn itself is retained.

## Project layout

```
├── start.sh                  # boots Hindsight + backend (add "--all" for the frontend)
├── .env.example              # every env var documented
├── requirements.txt
├── backend/
│   ├── main.py               # FastAPI routes (SSE chat, brands, connect, ingest, stats)
│   ├── scheduler.py          # collection pipeline + APScheduler jobs
│   ├── core/config.py        # pydantic-settings
│   ├── agent/                # grok_client, prompts, orchestrator (memory → tools → stream)
│   ├── memory/hindsight_db.py# bank-per-brand wrapper (retain/recall/reflect)
│   ├── connectors/           # youtube, instagram, manual (CSV) + base abstraction
│   ├── analysis/analyzer.py  # engagement, deltas, ranking, report builders
│   ├── db/                   # SQLAlchemy models + repo
│   ├── tools/                # native agent tools, registry, MCP scaffold
│   └── tests/                # 35 pytest tests
└── frontend/                 # Next.js App Router (app/), TypeScript + Tailwind
    ├── app/                  # layout, page (chat), globals.css
    ├── components/           # ChatWindow, MessageBubble, ChatInput, Sidebar, ConnectPanel
    └── lib/                  # api.ts (typed client + SSE reader), types.ts
```

## Setup

```bash
# 1. Python deps
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Configure
cp .env.example .env             # then edit: at minimum XAI_API_KEY
```

Get an xAI API key at [console.x.ai](https://console.x.ai). Set `GROK_MODEL` to a current
model ID from [x.ai/api](https://x.ai/api) (e.g. `grok-4-fast`).

```bash
# 3. Frontend deps
cd frontend && npm install && cp .env.local.example .env.local && cd ..
```

### Platform connections (all optional — chat works without them)

| Platform | What you need | Notes |
|---|---|---|
| **YouTube** | Google Cloud project → YouTube Data API v3 → API key, or OAuth client (desktop) for your own channel | OAuth: put client id/secret in `.env`, run `python -m connectors.youtube_auth`, paste the refresh token into `.env` |
| **Instagram** | Meta app with `instagram_basic` + `instagram_manage_insights`, an Instagram **professional** account linked to a Facebook Page, long-lived token + IG user ID | While Meta review is pending, use **Paste data** (CSV) — same pipeline |
| **Manual** | Nothing | Sidebar → Connections & data → Paste data. CSV columns: `post_id, caption, published_at, likes, comments, views` (+ optional `platform, url, shares, saves, reach`) |

Credentials can live in `.env` (server-wide) or be entered per-brand in the UI.

## Run

```bash
./start.sh            # Hindsight on :8888 + backend on :8000
./start.sh --all      # + frontend on :3000
```

Then open **http://localhost:3000**:

1. Create your brand.
2. Open **Connections & data** → connect a platform or paste CSV → **Collect now**.
3. Chat: *"What's working lately?"*, *"Why did engagement spike last week?"*,
   *"Restructure my content plan based on what's been performing."*

## API (docs at /docs)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | SSE stream: `tool` → `token`… → `done` events |
| GET/POST | `/api/brands` | list / create brands (creates the Hindsight bank) |
| POST/DELETE | `/api/brands/{id}/connect` | connect / disconnect a platform |
| POST | `/api/brands/{id}/ingest` | collect now |
| POST | `/api/brands/{id}/ingest/manual` | CSV ingestion |
| POST | `/api/brands/{id}/digest` | Grok-written daily analysis → memory |
| GET | `/api/brands/{id}/stats` `/posts` | sidebar cards / recent posts |
| GET | `/api/health` | backend + Hindsight + Grok + scheduler status |

## Verification

```bash
.venv/Scripts/python.exe -m pytest -q      # 35 passed   (Windows)
# macOS/Linux:  .venv/bin/python -m pytest -q
cd frontend && npx tsc --noEmit            # clean
cd frontend && npm run build               # production build OK
```

## Notes & limits

- **Retention semantics.** Posts are retained idempotently (`document_id` =
  `{platform}-{post_id}`), so refreshed metrics replace stale facts. Cycle reports and
  digests accumulate per-date, enabling temporal questions ("last month vs now").
- **MCP.** `backend/tools/mcp_tools.py` is a disabled scaffold; v1's native tools cover
  chat needs, and Hindsight can itself be exposed over MCP later.
- **Cost control.** Collection is interval-throttled; `grok-4-fast` keeps Hindsight's
  extraction cheap. Chat answers are capped at ~2k tokens.
- **Windows.** `start.sh` targets bash (Git Bash works). The venv path used in docs is
  `.venv/Scripts` on Windows and `.venv/bin` elsewhere.
