"""Application factory。"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from appraisal.api import health, v1
from appraisal.api.spa import mount_spa
from appraisal.config import Settings, get_settings
from appraisal.db import create_engine, create_sessionmaker
from appraisal.log import configure_logging


def create_app(
    settings: Settings | None = None,
    *,
    sessionmaker: async_sessionmaker[AsyncSession] | None = None,
) -> FastAPI:
    """建立 FastAPI app。

    settings 不給時用 get_settings()。sessionmaker 給了時，lifespan 使用它，不另外建立，
    也不負責釋放；測試藉此傳入綁在測試 transaction 上的版本。
    """
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # engine 一定建立：/readyz 直接用它檢查連線
        engine = create_engine(settings)
        app.state.engine = engine
        app.state.sessionmaker = sessionmaker or create_sessionmaker(engine)
        try:
            yield
        finally:
            await engine.dispose()

    app = FastAPI(lifespan=lifespan)
    app.include_router(health.router)
    app.include_router(v1.router)
    if settings.static_dir is not None:
        mount_spa(app, settings.static_dir)
    return app
