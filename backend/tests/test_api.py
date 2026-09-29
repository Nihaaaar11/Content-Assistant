"""API tests via TestClient with fake Grok + fake memory."""
from __future__ import annotations

import json

import pytest

import backend.main as main_mod
from backend.tests.conftest import FakeGrok


@pytest.fixture()
def client(db_session, fake_memory, monkeypatch):
    # patch settings so missing-credential test behaves predictably
    monkeypatch.setattr(main_mod.settings, "instagram_access_token", "")
    monkeypatch.setattr(main_mod.settings, "instagram_user_id", "")

    # patch memory used across the app
    monkeypatch.setattr(main_mod.hindsight_db, "get_memory", lambda: fake_memory)
    monkeypatch.setattr(main_mod, "start_scheduler", lambda: None)
    monkeypatch.setattr(main_mod, "stop_scheduler", lambda: None)

    import backend.memory.hindsight_db as mem_mod

    monkeypatch.setattr(mem_mod, "get_memory", lambda: fake_memory)

    from fastapi.testclient import TestClient

    app = main_mod.app
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["hindsight"] is True


def test_brand_crud_flow(client):
    brands = client.get("/api/brands").json()
    assert brands == []

    created = client.post("/api/brands", json={"name": "Acme", "description": "test"})
    assert created.status_code == 201
    assert created.json()["name"] == "Acme"

    dup = client.post("/api/brands", json={"name": "Acme"})
    assert dup.status_code == 409


def test_connect_requires_valid_platform(client):
    client.post("/api/brands", json={"name": "Acme"})
    brands = client.get("/api/brands").json()
    bid = brands[0]["id"]

    ok = client.post(
        f"/api/brands/{bid}/connect",
        json={"platform": "youtube", "handle": "@acme", "credentials": {"api_key": "k"}},
    )
    assert ok.status_code == 200

    bad = client.post(f"/api/brands/{bid}/connect", json={"platform": "tiktok"})
    assert bad.status_code == 400

    missing = client.post(f"/api/brands/{bid}/connect", json={"platform": "instagram"})
    assert missing.status_code == 400


def test_stats_and_posts(client):
    client.post("/api/brands", json={"name": "Acme"})
    bid = client.get("/api/brands").json()[0]["id"]

    client.post(
        f"/api/brands/{bid}/ingest/manual",
        json={"csv_text": "post_id,caption,likes,views\np1,Hello,10,100\n"},
    )

    stats = client.get(f"/api/brands/{bid}/stats").json()
    assert stats["post_count"] == 1
    assert stats["total_likes"] == 10

    posts = client.get(f"/api/brands/{bid}/posts").json()
    assert posts[0]["post_id"] == "p1"
    assert posts[0]["metrics"]["views"] == 100


def test_manual_ingest_bad_csv(client):
    client.post("/api/brands", json={"name": "Acme"})
    bid = client.get("/api/brands").json()[0]["id"]
    resp = client.post(f"/api/brands/{bid}/ingest/manual", json={"csv_text": "a,b\n1,2"})
    assert resp.status_code == 400


def test_chat_streams_sse(client, monkeypatch):
    client.post("/api/brands", json={"name": "Acme"})
    bid = client.get("/api/brands").json()[0]["id"]

    grok = FakeGrok(text="Structured answer about growth.")
    monkeypatch.setattr(main_mod, "Orchestrator", lambda: __import__(
        "backend.agent.orchestrator", fromlist=["Orchestrator"]
    ).Orchestrator(grok=grok, memory=main_mod.hindsight_db.get_memory()))

    resp = client.post(
        "/api/chat",
        json={"brand_id": bid, "message": "What should I post next week?", "history": []},
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]

    body = resp.text
    assert "event: tool" in body
    assert "event: token" in body
    assert "Structured answer about growth." in body
    assert "event: done" in body

    # the turn was retained into memory
    fake_memory = main_mod.hindsight_db.get_memory()
    assert any("What should I post next week?" in c["user"] for c in fake_memory.retained_chats)
