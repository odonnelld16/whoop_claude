from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    whoop_client_id: str = ""
    whoop_client_secret: str = ""
    whoop_redirect_uri: str = "http://localhost:8000/api/auth/whoop/callback"
    garmin_tokens_dir: str = "./garmin_session"
    database_url: str = "sqlite+aiosqlite:///./fitness.db"
    secret_key: str = "changeme"
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
