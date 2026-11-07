"""給請求處理使用的 dependency。"""

from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    """從 app.state.sessionmaker 取得 session。

    不 commit：commit 或 rollback 由使用它的 Service 決定；
    請求結束時 session 關閉，沒有 commit 的變更會被丟棄。
    """
    async with request.app.state.sessionmaker() as session:
        yield session
