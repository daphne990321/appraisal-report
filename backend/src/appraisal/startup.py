"""容器的預設 command：等待資料庫、執行 migration，然後以 uvicorn 取代目前的 process。

用法：python -m appraisal.startup [額外的 uvicorn 參數...]

結束碼：2 設定缺少或無效；3 等不到資料庫；4 migration 失敗。
"""

import asyncio
import logging
import os
import sys
import time
from typing import NoReturn

from sqlalchemy import text

from appraisal.config import Settings, SettingsError, get_settings
from appraisal.db import create_engine
from appraisal.log import configure_logging
from appraisal.migrations import upgrade_to_head

# 以 python -m 執行時 __name__ 是 "__main__"，固定名稱才會套用 appraisal logger 的等級
logger = logging.getLogger("appraisal.startup")

# 單次連線嘗試的上限；伺服器接受連線但不回應時也要能逾時
CONNECT_ATTEMPT_TIMEOUT_SECONDS = 5
RETRY_INTERVAL_SECONDS = 2


async def _try_connect(settings: Settings) -> None:
    engine = create_engine(settings)
    try:
        # timeout 包住整次嘗試（建立連線與查詢）
        async with asyncio.timeout(CONNECT_ATTEMPT_TIMEOUT_SECONDS):
            async with engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
    finally:
        await engine.dispose()


async def _wait_for_database(settings: Settings) -> bool:
    """重試到連上資料庫為止；從開始算起超過 startup_db_wait_seconds 就回傳 False。"""
    deadline = time.monotonic() + settings.startup_db_wait_seconds
    attempt = 0
    while True:
        attempt += 1
        try:
            await _try_connect(settings)
            return True
        except Exception as exc:
            # 只記例外類別名稱：例外訊息可能帶有連線資訊
            logger.warning(
                "Database not reachable yet (attempt %d): %s", attempt, type(exc).__name__
            )
        if time.monotonic() >= deadline:
            return False
        await asyncio.sleep(RETRY_INTERVAL_SECONDS)


def main(argv: list[str] | None = None) -> NoReturn:
    extra_args = sys.argv[1:] if argv is None else argv

    try:
        settings = get_settings()
    except SettingsError as exc:
        print(f"Invalid configuration: {exc}", file=sys.stderr)
        sys.exit(2)

    configure_logging(settings.log_level)

    if not asyncio.run(_wait_for_database(settings)):
        logger.error(
            "Database not reachable within %d seconds, giving up", settings.startup_db_wait_seconds
        )
        sys.exit(3)

    # 目前只有一個 process 執行 migration，所以不加鎖。
    # 如果將來有多個 replica 同時啟動，要在 upgrade_to_head() 之前，
    # 用同一條資料庫連線取得 PostgreSQL advisory lock（pg_advisory_lock），
    # migration 結束後再釋放，讓其他 replica 等到 schema 升級完成才往下走。
    try:
        upgrade_to_head(settings.database_url())
    except Exception:
        logger.exception("Database migration failed")
        sys.exit(4)

    # 成功時 process 被 uvicorn 取代
    os.execvp(
        "uvicorn",
        [
            "uvicorn",
            "--factory",
            "appraisal.main:create_app",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
            "--workers",
            "1",
            "--forwarded-allow-ips",
            settings.forwarded_allow_ips,
            *extra_args,
        ],
    )


if __name__ == "__main__":
    main()
