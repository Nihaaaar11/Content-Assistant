"""FastAPI application — BrandPulse backend entrypoint."""
from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend import schemas
from backend.agent.orchestrator import Orchestrator
from backend.connectors import get_connector
from backend.connectors.base import ConnectorError
from backend.core.config import settings
from backend.db import repo
from backend.db.models import get_sessionmaker, init_db
from backend.memory import hindsight_db
from backend.scheduler import collect_brand, run_daily_digest, start_scheduler, stop_scheduler
from backend.tools.registry import get_tools

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    get_tools()  # register native tools
    scheduler = start_scheduler()
    app.state.scheduler = scheduler
    logger.info("ContentMind AI backend ready (model=%s, hindsight=%s)", settings.grok_model, settings.hindsight_url)
    yield
    stop_scheduler()


app = FastAPI(title="ContentMind AI — Cross-Platform Content & Growth Agent", version="1.0.0", lifespan=lifespan)



app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _db() -> Session:
    return get_sessionmaker()()


# ---------------------------------------------------------------- health


@app.get("/api/health", response_model=schemas.HealthOut)
def health() -> schemas.HealthOut:
    hindsight_ok = False
    try:
        hindsight_ok = hindsight_db.get_memory().ping()
    except Exception:
        hindsight_ok = False
    return schemas.HealthOut(
        status="ok" if hindsight_ok else "degraded",
        hindsight=hindsight_ok,
        grok_configured=settings.has_xai(),
        gemini_configured=settings.has_gemini(),
        scheduler=app.state.scheduler is not None,
    )


# ---------------------------------------------------------------- brands


@app.get("/api/brands", response_model=list[schemas.BrandOut])
def list_brands() -> list[schemas.BrandOut]:
    with _db() as db:
        brands = repo.list_brands(db)
        out = []
        for b in brands:
            platforms = [a.platform for a in repo.list_accounts(db, b.id)]
            out.append(schemas.BrandOut(id=b.id, name=b.name, description=b.description, platforms=platforms))
        return out


@app.post("/api/brands", response_model=schemas.BrandOut, status_code=201)
def create_brand(payload: schemas.BrandCreate) -> schemas.BrandOut:
    with _db() as db:
        if repo.get_brand_by_name(db, payload.name):
            raise HTTPException(409, f"Brand '{payload.name}' already exists")
        brand = repo.create_brand(db, payload.name, payload.description)
        db.commit()
        hindsight_db.get_memory().ensure_bank(brand.id, brand.name)
        return schemas.BrandOut(id=brand.id, name=brand.name, description=brand.description, platforms=[])


# ---------------------------------------------------------------- connections


@app.post("/api/brands/{brand_id}/connect", response_model=schemas.ConnectOut)
def connect_platform(brand_id: int, payload: schemas.ConnectRequest) -> schemas.ConnectOut:
    with _db() as db:
        brand = repo.get_brand(db, brand_id)
        if brand is None:
            raise HTTPException(404, "Brand not found")
        creds = dict(payload.credentials)
        # allow env-fallback for convenience
        if payload.platform == "youtube":
            creds.setdefault("client_id", settings.youtube_client_id)
            creds.setdefault("client_secret", settings.youtube_client_secret)
            creds.setdefault("refresh_token", settings.youtube_refresh_token)
            creds.setdefault("api_key", settings.youtube_api_key)
            creds.setdefault("handle", payload.handle)
        elif payload.platform == "instagram":
            creds.setdefault("access_token", settings.instagram_access_token)
            creds.setdefault("user_id", settings.instagram_user_id)

        try:
            connector = get_connector(payload.platform, creds)
            connector.validate()
        except ConnectorError as exc:
            raise HTTPException(400, str(exc))

        repo.upsert_account(db, brand_id, payload.platform, handle=payload.handle, credentials=creds)
        db.commit()
    return schemas.ConnectOut(ok=True, platform=payload.platform, message="Connected.")


@app.delete("/api/brands/{brand_id}/connect/{platform}")
def disconnect_platform(brand_id: int, platform: str) -> dict:
    with _db() as db:
        brand = repo.get_brand(db, brand_id)
        if brand is None:
            raise HTTPException(404, "Brand not found")
        for acct in repo.list_accounts(db, brand_id):
            if acct.platform == platform:
                db.delete(acct)
        db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- ingestion


@app.post("/api/brands/{brand_id}/ingest", response_model=schemas.IngestOut)
def ingest_now(brand_id: int) -> schemas.IngestOut:
    with _db() as db:
        brand = repo.get_brand(db, brand_id)
        if brand is None:
            raise HTTPException(404, "Brand not found")
        name = brand.name
    try:
        result = collect_brand(brand_id, name)
    except Exception as exc:
        logger.exception("manual ingest failed")
        raise HTTPException(500, f"Collection failed: {exc}") from exc
    return schemas.IngestOut(ok=True, **{k: result.get(k, 0 if k != "errors" else []) for k in ("new_posts", "refreshed", "errors")})


@app.post("/api/brands/{brand_id}/ingest/manual", response_model=schemas.IngestOut)
def ingest_manual(brand_id: int, payload: schemas.ManualIngestRequest) -> schemas.IngestOut:
    with _db() as db:
        brand = repo.get_brand(db, brand_id)
        if brand is None:
            raise HTTPException(404, "Brand not found")
        name = brand.name
    from backend.scheduler import ingest_manual_csv

    result = ingest_manual_csv(brand_id, name, payload.csv_text)
    if result["errors"]:
        raise HTTPException(400, "; ".join(result["errors"]))
    return schemas.IngestOut(ok=True, new_posts=result["new_posts"], refreshed=0, errors=[])


@app.post("/api/brands/{brand_id}/digest")
def run_digest(brand_id: int) -> dict:
    with _db() as db:
        brand = repo.get_brand(db, brand_id)
        if brand is None:
            raise HTTPException(404, "Brand not found")
        name = brand.name
    try:
        digest = run_daily_digest(brand_id, name)
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"ok": True, "digest": digest}


# ---------------------------------------------------------------- stats & posts


@app.get("/api/brands/{brand_id}/stats", response_model=schemas.StatsOut)
def brand_stats(brand_id: int) -> schemas.StatsOut:
    with _db() as db:
        if repo.get_brand(db, brand_id) is None:
            raise HTTPException(404, "Brand not found")
        return schemas.StatsOut(**repo.brand_stats_summary(db, brand_id))


@app.get("/api/brands/{brand_id}/posts", response_model=list[schemas.PostOut])
def brand_posts(brand_id: int, limit: int = 20, platform: str | None = None) -> list[schemas.PostOut]:
    with _db() as db:
        posts = repo.recent_posts_with_metrics(db, brand_id, limit=limit, platform=platform)
        return [
            schemas.PostOut(
                id=p["id"],
                platform=p["platform"],
                post_id=p["post_id"],
                url=p["url"],
                caption=p["caption"],
                published_at=p["published_at"],
                metrics=p["metrics"],
            )
            for p in posts
        ]


# ---------------------------------------------------------------- chat (SSE)


@app.post("/api/chat")
async def chat(payload: schemas.ChatRequest) -> StreamingResponse:
    with _db() as db:
        brand = repo.get_brand(db, payload.brand_id)
        if brand is None:
            raise HTTPException(404, "Brand not found")
        brand_name = brand.name

    orchestrator = Orchestrator()
    history = [{"role": m.role, "content": m.content} for m in payload.history]

    async def event_stream():
        yield sse("tool", {"status": "Thinking…"})
        try:
            async for event in orchestrator.run(
                payload.brand_id, brand_name, payload.message, history
            ):
                yield sse(event["event"], event["data"])
        except Exception as exc:
            logger.exception("chat failed")
            msg = str(exc) if str(exc) else "Something went wrong inside the agent loop."
            yield sse("error", {"message": msg})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
