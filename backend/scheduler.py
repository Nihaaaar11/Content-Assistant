"""Automated observation: collect -> store -> retain -> analyze, on a schedule.

Pipeline per brand:
  1. each connected platform's connector fetches recent posts + metrics
  2. SQLite gets posts + new metric snapshots (time-series truth)
  3. new posts and refreshed metrics are retained into the brand's memory bank
  4. analyzer writes a cycle report into memory
Daily digest: Grok writes a deeper analysis from the last 24h of data.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from backend.agent.grok_client import GrokClient
from backend.agent.prompts import DAILY_DIGEST_SYSTEM
from backend.analysis.analyzer import build_cycle_report, build_digest_prompt, growth_delta, window_metrics
from backend.connectors import get_connector
from backend.connectors.base import ConnectorError
from backend.core.config import settings
from backend.db import repo
from backend.db.models import get_sessionmaker
from backend.memory import hindsight_db

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


# ---- pipeline ----------------------------------------------------------------


def collect_brand(brand_id: int, brand_name: str) -> dict[str, Any]:
    """Synchronous collection run for one brand. Safe to call from jobs/API."""
    db: Session = get_sessionmaker()()
    memory = hindsight_db.get_memory()
    summary: dict[str, Any] = {"new_posts": 0, "refreshed": 0, "errors": []}

    try:
        memory.ensure_bank(brand_id, brand_name)
        accounts = repo.list_accounts(db, brand_id)
        now = datetime.now(timezone.utc)

        for acct in accounts:
            if acct.platform == "manual":
                continue  # manual data arrives via API posts, not polling
            try:
                connector = get_connector(acct.platform, acct.credentials or {})
                connector.validate()
            except ConnectorError as exc:
                summary["errors"].append(f"{acct.platform}: {exc}")
                continue

            try:
                posts = connector.fetch_recent(limit=25)
            except ConnectorError as exc:
                summary["errors"].append(f"{acct.platform}: {exc}")
                continue

            new_count = 0
            refreshed = 0
            follower_count = getattr(connector, "followers", lambda: None)()

            for post in posts:
                db_post = repo.upsert_post(
                    db,
                    brand_id,
                    post.platform,
                    post.platform_post_id,
                    url=post.url,
                    caption=post.caption,
                    published_at=post.published_at,
                )
                prev = repo.latest_snapshot(db, db_post.id)
                snap = repo.add_snapshot(db, db_post.id, {**post.metrics, "followers": follower_count})

                is_new = prev is None
                changed = prev is not None and any(
                    getattr(snap, k) != getattr(prev, k)
                    for k in ("likes", "comments", "views", "shares", "saves", "reach")
                )
                if is_new:
                    new_count += 1
                    memory.retain_post(
                        brand_id,
                        post_id=post.platform_post_id,
                        platform=post.platform,
                        caption=post.caption,
                        published_at=(post.published_at or now).isoformat(),
                        metrics=post.metrics,
                        url=post.url,
                    )
                elif changed:
                    refreshed += 1
                    deltas = growth_delta(
                        {k: getattr(snap, k) for k in ("likes", "comments", "views", "shares", "saves", "reach")},
                        {k: getattr(prev, k) for k in ("likes", "comments", "views", "shares", "saves", "reach")},
                    )
                    moved = {k: v for k, v in deltas.items() if v != 0}
                    if moved:
                        memory.retain_post(
                            brand_id,
                            post_id=post.platform_post_id,
                            platform=post.platform,
                            caption=f"[metrics update] {post.caption[:200]}",
                            published_at=(post.published_at or now).isoformat(),
                            metrics=post.metrics,
                            url=post.url,
                        )

            acct.last_collected_at = now
            summary["new_posts"] += new_count
            summary["refreshed"] += refreshed

        db.commit()

        # cycle report into memory
        with_metrics = repo.recent_posts_with_metrics(db, brand_id, limit=30)
        report = build_cycle_report(brand_name, with_metrics, now=now)
        memory.retain_analysis(brand_id, report, now.isoformat(), kind="cycle")
        summary["report"] = report
        return summary
    finally:
        db.close()


def ingest_manual_csv(brand_id: int, brand_name: str, csv_text: str) -> dict[str, Any]:
    """Manual ingestion path (paste/CSV upload) through the same pipeline."""
    import io

    import csv as _csv

    db: Session = get_sessionmaker()()
    memory = hindsight_db.get_memory()
    summary: dict[str, Any] = {"new_posts": 0, "errors": []}

    try:
        memory.ensure_bank(brand_id, brand_name)
        reader = _csv.DictReader(io.StringIO(csv_text))
        required = {"post_id", "caption"}
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            summary["errors"].append(
                "CSV needs at least columns: post_id, caption "
                "(optional: platform,url,published_at,likes,comments,views,shares,saves,reach)"
            )
            return summary

        now = datetime.now(timezone.utc)
        for row in reader:
            platform = (row.get("platform") or "manual").strip().lower()
            metrics = {
                k: int(float(row[k]))
                for k in ("likes", "comments", "views", "shares", "saves", "reach")
                if row.get(k) not in (None, "")
            }
            published = None
            if row.get("published_at"):
                try:
                    published = datetime.fromisoformat(str(row["published_at"]).replace("Z", "+00:00"))
                except ValueError:
                    pass

            db_post = repo.upsert_post(
                db, brand_id, platform, row["post_id"].strip(),
                url=row.get("url") or "",
                caption=row.get("caption") or "",
                published_at=published,
            )
            prev = repo.latest_snapshot(db, db_post.id)
            repo.add_snapshot(db, db_post.id, metrics)
            memory.retain_post(
                brand_id,
                post_id=row["post_id"].strip(),
                platform=platform,
                caption=row.get("caption") or "",
                published_at=(published or now).isoformat(),
                metrics=metrics,
                url=row.get("url") or "",
            )
            summary["new_posts"] += 1 if prev is None else 0

        db.commit()
        with_metrics = repo.recent_posts_with_metrics(db, brand_id, limit=30)
        memory.retain_analysis(
            brand_id,
            build_cycle_report(brand_name, with_metrics, now=now),
            now.isoformat(),
            kind="cycle",
        )
        return summary
    finally:
        db.close()


def run_daily_digest(brand_id: int, brand_name: str, grok: GrokClient | None = None) -> str:
    """Grok-written daily analysis retained into memory."""
    db: Session = get_sessionmaker()()
    try:
        posts = repo.recent_posts_with_metrics(db, brand_id, limit=30)
        stats = repo.brand_stats_summary(db, brand_id)
        day_posts = window_metrics(posts, days=1) or posts[-5:]
        payload = build_digest_prompt(brand_name, day_posts, stats)
        client = grok or GrokClient()
        digest = asyncio.get_event_loop().run_until_complete(
            client.complete_text(DAILY_DIGEST_SYSTEM, payload)
        )
        hindsight_db.get_memory().retain_analysis(
            brand_id, digest, datetime.now(timezone.utc).isoformat(), kind="digest"
        )
        return digest
    finally:
        db.close()


# ---- scheduler service -------------------------------------------------------


def start_scheduler() -> AsyncIOScheduler | None:
    """Start APScheduler jobs (called from FastAPI lifespan)."""
    global _scheduler
    if not settings.scheduler_enabled:
        logger.info("Scheduler disabled via SCHEDULER_ENABLED=false")
        return None

    _scheduler = AsyncIOScheduler(timezone="UTC")

    def _collect_all() -> None:
        db: Session = get_sessionmaker()()
        try:
            brands = repo.list_brands(db)
        finally:
            db.close()
        for brand in brands:
            try:
                result = collect_brand(brand.id, brand.name)
                logger.info(
                    "collection for %s: +%s new, %s refreshed, errors=%s",
                    brand.name, result["new_posts"], result["refreshed"], result["errors"],
                )
            except Exception:
                logger.exception("collection failed for brand %s", brand.name)

    async def _digest_all() -> None:
        db: Session = get_sessionmaker()()
        try:
            brands = repo.list_brands(db)
        finally:
            db.close()
        for brand in brands:
            try:
                await asyncio.to_thread(run_daily_digest, brand.id, brand.name)
            except Exception:
                logger.exception("digest failed for brand %s", brand.name)

    _scheduler.add_job(
        _collect_all,
        IntervalTrigger(hours=settings.collection_interval_hours),
        id="collect-all",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.add_job(
        _digest_all,
        CronTrigger(hour=settings.digest_hour, minute=15),
        id="daily-digest",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info(
        "Scheduler started: collect every %sh, digest at %02d:15 UTC",
        settings.collection_interval_hours, settings.digest_hour,
    )
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
