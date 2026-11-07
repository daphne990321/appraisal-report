"""一次性測試資料庫：每次測試執行建立一個，結束時刪除。"""

import asyncio
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from appraisal.config import Settings
from appraisal.migrations import upgrade_to_head


@asynccontextmanager
async def create_test_database(
    settings: Settings, *, migrate: bool = True
) -> AsyncIterator[Settings]:
    """建立名稱為 ``{postgres_db}_test_{隨機字串}`` 的資料庫，離開時刪除它。

    migrate 為 True 時升級到最新的 revision。yield 的 Settings 指向新資料庫。
    建立或 migration 失敗時，例外原樣往外丟；不會跳過測試。
    只刪除自己建立的那個資料庫，不對主要資料庫做任何其他事。
    """
    name = f"{settings.postgres_db}_test_{secrets.token_hex(4)}"
    # CREATE DATABASE 不能放在 transaction 中執行，所以用 AUTOCOMMIT 連線。
    admin = create_async_engine(settings.database_url(), isolation_level="AUTOCOMMIT")
    try:
        async with admin.connect() as connection:
            await connection.execute(text(f'CREATE DATABASE "{name}"'))
        try:
            test_settings = settings.model_copy(update={"postgres_db": name})
            if migrate:
                await asyncio.to_thread(upgrade_to_head, test_settings.database_url())
            yield test_settings
        finally:
            # WITH (FORCE) 會斷開測試中忘了關閉的連線，確保刪除一定成功。
            async with admin.connect() as connection:
                await connection.execute(text(f'DROP DATABASE "{name}" WITH (FORCE)'))
    finally:
        await admin.dispose()
