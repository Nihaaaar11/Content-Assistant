"""Central configuration loaded from environment (.env supported)."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """All runtime settings. Every field has a safe default except the xAI key."""

    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- LLM Providers (Gemini or xAI / Grok) --------------------------------
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.7-flash"
    xai_api_key: str = ""
    grok_model: str = "grok-4-fast"
    llm_provider: str = "auto"  # auto | gemini | grok

    # --- Hindsight ----------------------------------------------------------
    hindsight_url: str = "http://localhost:8888"

    # --- Backend ------------------------------------------------------------
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:3000"
    database_url: str = "sqlite:///./data/agent.db"
    frontend_url: str = "http://localhost:3000"

    # --- Scheduler ----------------------------------------------------------
    collection_interval_hours: float = 6.0
    digest_hour: int = 7
    scheduler_enabled: bool = True

    # --- YouTube ------------------------------------------------------------
    youtube_client_id: str = ""
    youtube_client_secret: str = ""
    youtube_refresh_token: str = ""
    youtube_api_key: str = ""

    # --- Instagram ----------------------------------------------------------
    instagram_access_token: str = ""
    instagram_user_id: str = ""

    # --- helpers ------------------------------------------------------------
    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def database_path(self) -> Path:
        """Resolve the sqlite file path (creates parent dirs)."""
        prefix = "sqlite:///"
        raw = self.database_url
        if raw.startswith(prefix):
            file_part = raw[len(prefix):]
            p = Path(file_part if file_part.startswith("/") else ROOT_DIR / file_part)
            p.parent.mkdir(parents=True, exist_ok=True)
            return p
        raise ValueError("Only sqlite:// DATABASE_URL is supported in v1")

    def has_gemini(self) -> bool:
        return bool(self.gemini_api_key.strip())

    def has_xai(self) -> bool:
        return bool(self.xai_api_key.strip())

    def has_llm(self) -> bool:
        return self.has_gemini() or self.has_xai()

    def has_youtube_oauth(self) -> bool:
        return bool(self.youtube_client_id and self.youtube_client_secret)

    def has_youtube_api_key(self) -> bool:
        return bool(self.youtube_api_key.strip())

    def has_instagram(self) -> bool:
        return bool(self.instagram_access_token.strip() and self.instagram_user_id.strip())


def get_settings() -> Settings:
    return Settings()


class _SettingsProxy:
    def __getattr__(self, name: str):
        return getattr(get_settings(), name)


settings = _SettingsProxy()  # type: ignore
