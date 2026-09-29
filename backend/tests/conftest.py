"""Shared fixtures: isolated DB + fake memory + fake Grok."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

# Isolated env BEFORE any backend import touches settings.
os.environ.setdefault("XAI_API_KEY", "test-key")
os.environ.setdefault("DATABASE_URL", "sqlite:///./data/test.db")


@pytest.fixture()
def db_session(tmp_path, monkeypatch):
    """Fresh SQLite DB per test."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from backend.db import models

    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False}
    )
    models.Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)

    monkeypatch.setattr(models, "_SessionLocal", TestingSession)
    from backend.db import repo as repo_mod  # noqa: F401

    yield TestingSession()
    engine.dispose()


class FakeMemory:
    """HindsightMemory stand-in capturing calls in memory."""

    def __init__(self):
        self.retained_posts: list[dict] = []
        self.retained_analyses: list[dict] = []
        self.retained_chats: list[dict] = []
        self.recall_results = []
        self.reflect_answer = "reflection answer"
        self.banks: list[tuple[int, str]] = []

    def ensure_bank(self, brand_id, brand_name):
        self.banks.append((brand_id, brand_name))
        return f"brand_{brand_id}"

    def retain_post(self, brand_id, **kw):
        self.retained_posts.append({"brand_id": brand_id, **kw})

    def retain_analysis(self, brand_id, report, analysis_date, kind="cycle"):
        self.retained_analyses.append(
            {"brand_id": brand_id, "report": report, "date": analysis_date, "kind": kind}
        )

    def retain_chat_turn(self, brand_id, user_message, assistant_reply, turn_date):
        self.retained_chats.append(
            {"brand_id": brand_id, "user": user_message, "assistant": assistant_reply}
        )

    def recall(self, brand_id, query, types=None, budget="mid", max_results=20):
        return self.recall_results

    def reflect(self, brand_id, query):
        return self.reflect_answer

    def ping(self):
        return True


@pytest.fixture()
def fake_memory():
    return FakeMemory()


class FakeGrok:
    """GrokClient stand-in yielding scripted streaming chunks."""

    def __init__(self, text="Final analyst answer."):
        self.text = text
        self.calls: list[list[dict]] = []

    def stream(self, messages, tools=None, **kw):
        self.calls.append(messages)

        async def _gen():
            from types import SimpleNamespace

            chunk = SimpleNamespace(
                choices=[
                    SimpleNamespace(
                        delta=SimpleNamespace(content=self.text, tool_calls=None)
                    )
                ]
            )
            yield chunk

        return _gen()

    async def chat(self, messages, tools=None, **kw):
        from types import SimpleNamespace

        self.calls.append(messages)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=self.text, tool_calls=None))]
        )

    async def complete_text(self, system, user, max_tokens=1500):
        return f"[digest] {user[:50]}"
