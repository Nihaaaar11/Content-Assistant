"""Collection pipeline tests (fake connectors, fake memory, temp DB)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

import backend.scheduler as sched
from backend.connectors.base import NormalizedPost


class FakeConnector:
    platform = "youtube"

    def __init__(self, credentials):
        self.credentials = credentials

    def validate(self):
        pass

    def fetch_recent(self, limit=25):
        now = datetime.now(timezone.utc)
        return [
            NormalizedPost(
                platform="youtube",
                platform_post_id="v1",
                caption="Launch",
                url="http://yt/v1",
                published_at=now - timedelta(days=1),
                metrics={"views": 1000, "likes": 100, "comments": 10},
            ),
            NormalizedPost(
                platform="youtube",
                platform_post_id="v2",
                caption="Second",
                url="http://yt/v2",
                published_at=now - timedelta(days=2),
                metrics={"views": 500, "likes": 40, "comments": 4},
            ),
        ]

    def followers(self):
        return 4321


@pytest.fixture()
def wired(monkeypatch, fake_memory):
    monkeypatch.setattr(sched, "get_connector", lambda p, c: FakeConnector(c))
    from backend.db import models

    monkeypatch.setattr(models, "_SessionLocal", models._SessionLocal)
    monkeypatch.setattr(sched.hindsight_db, "get_memory", lambda: fake_memory)
    return fake_memory


def test_collect_brand_new_posts(db_session, wired):
    from backend.db import repo

    brand = repo.create_brand(db_session, "Acme")
    db_session.flush()
    repo.upsert_account(db_session, brand.id, "youtube", credentials={"api_key": "k"})
    db_session.commit()

    result = sched.collect_brand(brand.id, "Acme")

    assert result["new_posts"] == 2
    assert result["errors"] == []
    assert len(wired.retained_posts) == 2
    assert len(wired.retained_analyses) == 1
    assert "Top performers" in result["report"]


def test_collect_brand_refresh_moved_metrics(db_session, wired):
    from backend.db import repo

    brand = repo.create_brand(db_session, "Acme")
    db_session.flush()
    repo.upsert_account(db_session, brand.id, "youtube", credentials={"api_key": "k"})
    db_session.commit()

    sched.collect_brand(brand.id, "Acme")

    # metrics move on the second run -> refresh retain happens
    class Bigger(FakeConnector):
        def fetch_recent(self, limit=25):
            posts = super().fetch_recent(limit)
            posts[0].metrics = {"views": 2000, "likes": 250, "comments": 20}
            return posts

    monkey_big = Bigger({"api_key": "k"})
    import backend.connectors as conn_mod

    saved = conn_mod.get_connector
    import backend.scheduler as s2

    orig = s2.get_connector
    s2.get_connector = lambda p, c: Bigger(c)  # type: ignore
    try:
        result = s2.collect_brand(brand.id, "Acme")
    finally:
        s2.get_connector = orig  # type: ignore

    assert result["refreshed"] >= 1
    assert result["new_posts"] == 0
    assert any(p["caption"].startswith("[metrics update]") for p in wired.retained_posts)


def test_collect_reports_connector_errors(db_session, wired, monkeypatch):
    from backend.connectors.base import ConnectorError
    from backend.db import repo

    class Broken(FakeConnector):
        def validate(self):
            raise ConnectorError("bad creds")

    monkeypatch.setattr(sched, "get_connector", lambda p, c: Broken(c))

    brand = repo.create_brand(db_session, "BrokenBrand")
    db_session.flush()
    repo.upsert_account(db_session, brand.id, "youtube", credentials={})
    db_session.commit()

    result = sched.collect_brand(brand.id, "BrokenBrand")
    assert result["new_posts"] == 0
    assert any("bad creds" in e for e in result["errors"])


def test_manual_csv_ingest(db_session, wired):
    from backend.db import repo

    brand = repo.create_brand(db_session, "ManualBrand")
    db_session.flush()
    db_session.commit()

    csv_text = (
        "post_id,caption,published_at,likes,comments,views\n"
        "m1,Pasted post,2024-03-15,33,3,900\n"
    )
    result = sched.ingest_manual_csv(brand.id, "ManualBrand", csv_text)

    assert result["new_posts"] == 1
    assert result["errors"] == []
    assert len(wired.retained_posts) == 1
    assert wired.retained_posts[0]["metrics"]["likes"] == 33

    posts = repo.recent_posts_with_metrics(db_session, brand.id)
    assert posts[0]["metrics"]["views"] == 900


def test_manual_csv_bad_columns(db_session, wired):
    from backend.db import repo

    brand = repo.create_brand(db_session, "ManualBrand2")
    db_session.flush()
    db_session.commit()

    result = sched.ingest_manual_csv(brand.id, "ManualBrand2", "foo,bar\n1,2\n")
    assert result["errors"]
