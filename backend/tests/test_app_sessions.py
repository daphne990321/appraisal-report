"""資料庫 session 的來源與 commit 的可見範圍。"""

from collections.abc import AsyncIterator
from typing import Annotated

import pytest
import pytest_asyncio
from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession

from appraisal.api.deps import get_db_session
from appraisal.config import Settings
from appraisal.db import create_sessionmaker
from tests.fixtures.app_client import open_running_app

PROBE_TABLE = "app_session_probe"


@pytest_asyncio.fixture(scope="module")
async def app_probe_table(engine: AsyncEngine) -> AsyncIterator[str]:
    """在測試的 transaction 之外（autocommit）建立探測表，模組結束時刪除。"""
    async with engine.begin() as connection:
        await connection.execute(text(f"CREATE TABLE {PROBE_TABLE} (marker text PRIMARY KEY)"))
    try:
        yield PROBE_TABLE
    finally:
        async with engine.begin() as connection:
            await connection.execute(text(f"DROP TABLE IF EXISTS {PROBE_TABLE}"))


async def _report_session_origin(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> dict[str, object]:
    return {"origin": session.info.get("origin")}


@pytest.mark.parametrize("marker", ["app-writer-one", "app-writer-two"])
async def test_row_committed_through_app_session_is_invisible_to_other_tests(
    app: FastAPI, app_probe_table: str, marker: str
) -> None:
    # 每個參數化的版本都透過 app.state.sessionmaker 寫入自己的識別值，並確認只看得到自己那一筆。
    # 與執行順序無關：先執行的版本若讓資料外洩，後執行的版本就會看到它。
    async with app.state.sessionmaker() as session:
        await session.execute(
            text(f"INSERT INTO {app_probe_table} (marker) VALUES (:marker)"), {"marker": marker}
        )
        await session.commit()
        result = await session.execute(
            text(f"SELECT marker FROM {app_probe_table} ORDER BY marker")
        )
        visible = [str(value) for value in result.scalars().all()]

    assert visible == [marker], f"only this test's row should be visible, got {visible!r}"


async def test_route_session_is_taken_from_sessionmaker_given_to_create_app(
    test_settings: Settings, db_connection: AsyncConnection
) -> None:
    # 用 info 標記這個 sessionmaker；路由拿到的 session 若帶有這個標記，就是來自傳入的那一個。
    tagged = create_sessionmaker(
        db_connection,
        join_transaction_mode="create_savepoint",
        info={"origin": "test-sessionmaker"},
    )
    async with open_running_app(test_settings, sessionmaker=tagged) as running:
        running.app.add_api_route("/probe-session", _report_session_origin, methods=["GET"])
        response = await running.client.get("/probe-session")

    assert response.status_code == 200, f"probe route should answer, got {response.status_code}"
    assert response.json() == {"origin": "test-sessionmaker"}, (
        "get_db_session should yield a session from the sessionmaker given to create_app"
    )
