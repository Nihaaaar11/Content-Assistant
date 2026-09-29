"""Query helpers over the SQLite metric store."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db.models import Brand, ConnectedAccount, MetricSnapshot, Post


def get_brand(session: Session, brand_id: int) -> Brand | None:
    return session.get(Brand, brand_id)


def get_brand_by_name(session: Session, name: str) -> Brand | None:
    return session.execute(
        select(Brand).where(Brand.name == name)
    ).scalar_one_or_none()


def list_brands(session: Session) -> list[Brand]:
    return list(session.execute(select(Brand).order_by(Brand.id)).scalars())


def create_brand(session: Session, name: str, description: str = "") -> Brand:
    brand = Brand(name=name, description=description)
    session.add(brand)
    session.flush()
    return brand


def upsert_account(
    session: Session,
    brand_id: int,
    platform: str,
    handle: str = "",
    credentials: dict | None = None,
) -> ConnectedAccount:
    acct = session.execute(
        select(ConnectedAccount).where(
            ConnectedAccount.brand_id == brand_id,
            ConnectedAccount.platform == platform,
        )
    ).scalar_one_or_none()
    if acct is None:
        acct = ConnectedAccount(brand_id=brand_id, platform=platform)
        session.add(acct)
    if handle:
        acct.handle = handle
    if credentials:
        acct.credentials = credentials
    session.flush()
    return acct


def list_accounts(session: Session, brand_id: int) -> list[ConnectedAccount]:
    return list(
        session.execute(
            select(ConnectedAccount).where(ConnectedAccount.brand_id == brand_id)
        ).scalars()
    )


def upsert_post(
    session: Session,
    brand_id: int,
    platform: str,
    platform_post_id: str,
    url: str = "",
    caption: str = "",
    published_at: datetime | None = None,
) -> Post:
    """Idempotent post insert keyed on (brand, platform, platform_post_id)."""
    post = session.execute(
        select(Post).where(
            Post.brand_id == brand_id,
            Post.platform == platform,
            Post.platform_post_id == platform_post_id,
        )
    ).scalar_one_or_none()
    if post is None:
        post = Post(
            brand_id=brand_id,
            platform=platform,
            platform_post_id=platform_post_id,
        )
        session.add(post)
    post.url = url or post.url
    post.caption = caption if caption else post.caption
    if published_at:
        post.published_at = published_at
    session.flush()
    return post


def add_snapshot(session: Session, post_id: int, metrics: dict[str, Any]) -> MetricSnapshot:
    snap = MetricSnapshot(
        post_id=post_id,
        likes=int(metrics.get("likes") or 0),
        comments=int(metrics.get("comments") or 0),
        views=int(metrics.get("views") or 0),
        shares=int(metrics.get("shares") or 0),
        saves=int(metrics.get("saves") or 0),
        reach=int(metrics.get("reach") or 0),
        followers=metrics.get("followers"),
        extra=metrics.get("extra") or {},
    )
    session.add(snap)
    session.flush()
    return snap


def latest_snapshot(session: Session, post_id: int) -> MetricSnapshot | None:
    return session.execute(
        select(MetricSnapshot)
        .where(MetricSnapshot.post_id == post_id)
        .order_by(MetricSnapshot.collected_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def previous_snapshot(session: Session, post_id: int, before: datetime) -> MetricSnapshot | None:
    return session.execute(
        select(MetricSnapshot)
        .where(MetricSnapshot.post_id == post_id)
        .where(MetricSnapshot.collected_at < before)
        .order_by(MetricSnapshot.collected_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def recent_posts_with_metrics(
    session: Session,
    brand_id: int,
    limit: int = 20,
    platform: str | None = None,
) -> list[dict[str, Any]]:
    """Posts joined with their latest snapshot, newest first."""
    q = (
        select(Post)
        .where(Post.brand_id == brand_id)
        .order_by(Post.published_at.desc().nullslast(), Post.id.desc())
        .limit(limit)
    )
    if platform:
        q = q.where(Post.platform == platform)
    posts = list(session.execute(q).scalars())
    out: list[dict[str, Any]] = []
    for p in posts:
        snap = latest_snapshot(session, p.id)
        out.append(
            {
                "id": p.id,
                "platform": p.platform,
                "post_id": p.platform_post_id,
                "url": p.url,
                "caption": (p.caption or "")[:280],
                "published_at": p.published_at.isoformat() if p.published_at else None,
                "metrics": _snapshot_dict(snap),
            }
        )
    return out


def brand_stats_summary(session: Session, brand_id: int) -> dict[str, Any]:
    """Aggregate stats for the UI sidebar cards."""
    posts = recent_posts_with_metrics(session, brand_id, limit=100)
    total_likes = sum((p["metrics"] or {}).get("likes", 0) for p in posts)
    total_comments = sum((p["metrics"] or {}).get("comments", 0) for p in posts)
    total_views = sum((p["metrics"] or {}).get("views", 0) for p in posts)

    top = sorted(
        posts,
        key=lambda p: _engagement(p["metrics"] or {}),
        reverse=True,
    )[:3]

    follower = _latest_followers(session, brand_id)
    return {
        "post_count": len(posts),
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_views": total_views,
        "followers": follower,
        "top_posts": [
            {
                "caption": p["caption"][:80],
                "platform": p["platform"],
                "url": p["url"],
                "engagement": _engagement(p["metrics"] or {}),
                "metrics": p["metrics"],
            }
            for p in top
        ],
    }


# ---- internal ---------------------------------------------------------------


def _snapshot_dict(snap: MetricSnapshot | None) -> dict[str, int] | None:
    if snap is None:
        return None
    return {
        "likes": snap.likes,
        "comments": snap.comments,
        "views": snap.views,
        "shares": snap.shares,
        "saves": snap.saves,
        "reach": snap.reach,
    }


def _engagement(m: dict[str, int]) -> int:
    return int(m.get("likes", 0)) + int(m.get("comments", 0)) + int(m.get("saves", 0))


def _latest_followers(session: Session, brand_id: int) -> int | None:
    row = session.execute(
        select(MetricSnapshot)
        .join(Post, MetricSnapshot.post_id == Post.id)
        .where(Post.brand_id == brand_id, MetricSnapshot.followers.isnot(None))
        .order_by(MetricSnapshot.collected_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    return row.followers if row else None
