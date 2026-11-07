"""Alembic 環境：以 async engine 執行 migration。

連線網址順序：config.attributes["database_url"] → get_settings().database_url()。
不呼叫 logging.config.fileConfig()：它會關掉已存在的 logger，蓋掉 configure_logging() 的設定。
"""

import asyncio

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

import appraisal.models  # noqa: F401  # 匯入後 metadata 才包含全部資料表
from appraisal.config import get_settings
from appraisal.db import metadata

config = context.config


def _do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=metadata)
    with context.begin_transaction():
        context.run_migrations()


async def _run_async_migrations() -> None:
    url = config.attributes.get("database_url") or get_settings().database_url()
    engine = create_async_engine(url, poolclass=pool.NullPool)
    try:
        async with engine.connect() as connection:
            await connection.run_sync(_do_run_migrations)
    finally:
        await engine.dispose()


if context.is_offline_mode():
    raise RuntimeError("Offline migration mode is not supported")
asyncio.run(_run_async_migrations())
