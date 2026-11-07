"""應用程式與 HTTP client 的共用啟動方式。

這個模組不依賴應用程式的進入點，所以不使用它的測試也能載入這個模組。
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

import httpx
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from appraisal.config import Settings


@dataclass(frozen=True)
class RunningApp:
    """啟動中的應用程式，以及綁在它上面的 HTTP client。"""

    app: FastAPI
    client: httpx.AsyncClient


@asynccontextmanager
async def open_running_app(
    settings: Settings, sessionmaker: async_sessionmaker[AsyncSession] | None = None
) -> AsyncIterator[RunningApp]:
    """建立應用程式、執行 lifespan，並回傳 app 與它的 client。離開時關閉兩者。

    測試可以在 yield 之後、送出請求之前，對 app 加入暫時的路由。
    """
    # 在函式內才 import，讓這個模組在應用程式進入點尚未完成時也能載入。
    from appraisal.main import create_app

    application = create_app(settings, sessionmaker=sessionmaker)
    async with application.router.lifespan_context(application):
        transport = httpx.ASGITransport(app=application)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield RunningApp(app=application, client=client)
