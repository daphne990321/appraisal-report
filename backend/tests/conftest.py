"""共用的測試 fixture：一次性資料庫、連線、session、應用程式與 HTTP client。

資料庫的寫入隔離方式：每個測試的連線都開一個外層 transaction，測試結束時 rollback。
session 使用 SAVEPOINT，所以測試中的 commit 不會真的寫進資料庫。
"""

from collections.abc import AsyncIterator

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
)

from appraisal.config import Settings, get_settings
from appraisal.db import create_engine, create_sessionmaker
from tests.fixtures.app_client import RunningApp, open_running_app
from tests.fixtures.database import create_test_database


@pytest.fixture(scope="session")
def base_settings() -> Settings:
    """指向 compose 中 postgres 的設定。一次性測試資料庫由它建立。"""
    return get_settings()


@pytest_asyncio.fixture(scope="session")
async def test_settings(base_settings: Settings) -> AsyncIterator[Settings]:
    """整個測試執行共用的一次性資料庫（已升級到最新 revision）。"""
    async with create_test_database(base_settings) as settings:
        yield settings


@pytest_asyncio.fixture(scope="session")
async def engine(test_settings: Settings) -> AsyncIterator[AsyncEngine]:
    db_engine = create_engine(test_settings)
    try:
        yield db_engine
    finally:
        await db_engine.dispose()


@pytest_asyncio.fixture
async def db_connection(engine: AsyncEngine) -> AsyncIterator[AsyncConnection]:
    """外層 transaction；測試結束時 rollback，所以測試中的寫入都會消失。"""
    async with engine.connect() as connection:
        transaction = await connection.begin()
        try:
            yield connection
        finally:
            await transaction.rollback()


@pytest.fixture
def sessionmaker(db_connection: AsyncConnection) -> async_sessionmaker[AsyncSession]:
    """綁在外層 transaction 上的 sessionmaker；session 的 commit 只釋放 SAVEPOINT。"""
    return create_sessionmaker(db_connection, join_transaction_mode="create_savepoint")


@pytest_asyncio.fixture
async def db_session(sessionmaker: async_sessionmaker[AsyncSession]) -> AsyncIterator[AsyncSession]:
    async with sessionmaker() as session:
        yield session


@pytest_asyncio.fixture
async def running_app(
    test_settings: Settings, sessionmaker: async_sessionmaker[AsyncSession]
) -> AsyncIterator[RunningApp]:
    """以測試的 sessionmaker 啟動的應用程式與 client；app 與 client 都由它而來。"""
    async with open_running_app(test_settings, sessionmaker=sessionmaker) as running:
        yield running


@pytest_asyncio.fixture
async def app(running_app: RunningApp) -> FastAPI:
    return running_app.app


@pytest_asyncio.fixture
async def client(running_app: RunningApp) -> httpx.AsyncClient:
    return running_app.client
