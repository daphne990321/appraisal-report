"""應用程式設定：只從 process 環境變數讀取並驗證。"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    # 空字串視為沒有設定：必要欄位列為缺少，選用欄位使用預設值
    model_config = SettingsConfigDict(env_file=None, case_sensitive=False, env_ignore_empty=True)

    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str
    postgres_password: SecretStr
    postgres_db: str
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    static_dir: Path | None = None
    startup_db_wait_seconds: int = Field(default=60, ge=1)
    forwarded_allow_ips: str = "*"

    def database_url(self, database: str | None = None) -> URL:
        """回傳 postgresql+asyncpg 的連線網址；database 不給時用 postgres_db。

        URL 物件的文字表示會遮住密碼。
        """
        return URL.create(
            "postgresql+asyncpg",
            username=self.postgres_user,
            password=self.postgres_password.get_secret_value(),
            host=self.postgres_host,
            port=self.postgres_port,
            database=database or self.postgres_db,
        )


class SettingsError(RuntimeError):
    """設定缺少或無效。訊息列出每一個有問題的環境變數名稱（大寫）。"""


@lru_cache
def get_settings() -> Settings:
    """讀取並快取 Settings；驗證失敗時轉成只列出變數名稱的 SettingsError。"""
    try:
        return Settings()
    except ValidationError as exc:
        missing: list[str] = []
        invalid: list[str] = []
        for error in exc.errors():
            name = str(error["loc"][0]).upper()
            target = missing if error["type"] == "missing" else invalid
            if name not in target:
                target.append(name)
        # 訊息只放變數名稱，不放值，避免密碼進入 log
        parts: list[str] = []
        if missing:
            parts.append(f"Missing required environment variable(s): {', '.join(missing)}")
        if invalid:
            parts.append(f"Invalid environment variable(s): {', '.join(invalid)}")
        raise SettingsError("; ".join(parts)) from None
