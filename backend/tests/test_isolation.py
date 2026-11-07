"""一次性資料庫與測試 transaction 的隔離行為。"""

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy import Text, text
from sqlalchemy.engine import URL
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncEngine,
    AsyncSession,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from appraisal.config import Settings
from appraisal.db import create_sessionmaker
from tests.fixtures import database as database_module
from tests.fixtures.database import create_test_database
from tests.fixtures.network import unused_local_port

PROBE_TABLE = "isolation_probe"


class _ProbeBase(DeclarativeBase):
    """這個檔案專用的 declarative base。不用共用的 Base，避免改動共用的 metadata。"""


class _ProbeNote(_ProbeBase):
    __tablename__ = "isolation_orm_probe"

    id: Mapped[int] = mapped_column(primary_key=True)
    body: Mapped[str] = mapped_column(Text)


@pytest_asyncio.fixture(scope="module")
async def probe_table(engine: AsyncEngine) -> AsyncIterator[str]:
    """在測試的 transaction 之外（autocommit）建立探測表，模組結束時刪除。"""
    async with engine.begin() as connection:
        await connection.execute(text(f"CREATE TABLE {PROBE_TABLE} (marker text PRIMARY KEY)"))
    try:
        yield PROBE_TABLE
    finally:
        async with engine.begin() as connection:
            await connection.execute(text(f"DROP TABLE IF EXISTS {PROBE_TABLE}"))


@pytest_asyncio.fixture(scope="module")
async def orm_probe_table(engine: AsyncEngine) -> AsyncIterator[None]:
    """在測試的 transaction 之外建立 ORM 探測表，模組結束時刪除。"""
    async with engine.begin() as connection:
        await connection.run_sync(_ProbeBase.metadata.create_all)
    try:
        yield
    finally:
        async with engine.begin() as connection:
            await connection.run_sync(_ProbeBase.metadata.drop_all)


async def _database_exists(settings: Settings, name: str) -> bool:
    engine = create_async_engine(settings.database_url())
    try:
        async with engine.connect() as connection:
            result = await connection.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": name}
            )
            return result.first() is not None
    finally:
        await engine.dispose()


async def test_helper_database_has_its_own_name_and_is_dropped_on_exit(
    base_settings: Settings,
) -> None:
    async with create_test_database(base_settings, migrate=False) as db_settings:
        name = db_settings.postgres_db
        assert name != base_settings.postgres_db, (
            "helper database must not reuse the main database name"
        )
        assert "_test_" in name, f"helper database name should contain '_test_', got {name!r}"
        assert await _database_exists(base_settings, name), (
            "helper database should exist inside the block"
        )

    assert not await _database_exists(base_settings, name), (
        "helper database should be gone after exit"
    )


async def test_unreachable_database_raises_connection_error_instead_of_yielding(
    base_settings: Settings,
) -> None:
    unreachable = base_settings.model_copy(
        update={"postgres_host": "127.0.0.1", "postgres_port": unused_local_port()}
    )
    # 驅動程式與 SQLAlchemy 丟出的連線錯誤型別不同；這裡只接受這兩類，
    # 所以程式本身的錯誤（例如 AttributeError）不會被誤當成通過。
    with pytest.raises((OSError, SQLAlchemyError)):
        async with create_test_database(unreachable, migrate=False):
            pytest.fail("create_test_database yielded although the server is unreachable")


@pytest.mark.parametrize("marker", ["writer-one", "writer-two"])
async def test_row_committed_in_one_test_is_invisible_to_other_tests(
    db_session: AsyncSession, probe_table: str, marker: str
) -> None:
    # 每個參數化的版本都寫入自己的識別值，並確認表中只看得到自己那一筆。
    # 與執行順序無關：先執行的版本若讓資料外洩，後執行的版本就會看到它。
    await db_session.execute(
        text(f"INSERT INTO {probe_table} (marker) VALUES (:marker)"), {"marker": marker}
    )
    await db_session.commit()

    result = await db_session.execute(text(f"SELECT marker FROM {probe_table} ORDER BY marker"))
    visible = [str(value) for value in result.scalars().all()]
    assert visible == [marker], f"only this test's row should be visible, got {visible!r}"


@pytest.mark.usefixtures("orm_probe_table")
async def test_object_attributes_remain_readable_after_commit(
    db_connection: AsyncConnection,
) -> None:
    make_session = create_sessionmaker(db_connection, join_transaction_mode="create_savepoint")
    async with make_session() as session:
        note = _ProbeNote(body="written-before-commit")
        session.add(note)
        await session.commit()

        # commit 之後不應該讓屬性過期；讀取時不能再發出查詢。
        assert note.body == "written-before-commit", "attribute should stay readable after commit"
        assert note.id is not None, "primary key should stay readable after commit"


class _MigrationFailure(Exception):
    """代替 migration 失敗的例外；測試確認它被原樣丟出。"""


async def test_migration_failure_propagates_the_same_exception_object(
    base_settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    failure = _MigrationFailure("simulated migration failure")

    def failing_upgrade(database_url: URL) -> None:
        raise failure

    # 真正的 migration 只能在資料庫建立之後執行，無法在這裡讓它真的失敗。
    # 所以只替換 migration 這個呼叫點；建立與刪除資料庫的流程仍然是真的。
    monkeypatch.setattr(database_module, "upgrade_to_head", failing_upgrade)

    with pytest.raises(_MigrationFailure) as excinfo:
        async with create_test_database(base_settings):
            pytest.fail("the block should not run when the migration fails")

    assert excinfo.value is failure, "the migration exception should not be wrapped or replaced"


class _BlockFailure(Exception):
    """測試的 async with 區塊中丟出的例外。"""


async def test_helper_database_is_dropped_when_block_raises(base_settings: Settings) -> None:
    failure = _BlockFailure("simulated failure inside the block")
    created_name = ""

    with pytest.raises(_BlockFailure) as excinfo:
        async with create_test_database(base_settings, migrate=False) as db_settings:
            created_name = db_settings.postgres_db
            assert await _database_exists(base_settings, created_name), (
                "helper database should exist inside the block"
            )
            raise failure

    assert excinfo.value is failure, "the block's exception should propagate unchanged"
    assert not await _database_exists(base_settings, created_name), (
        "helper database should be dropped even though the block raised"
    )
