"""Alembic 的升級與降級行為。

預期的 revision 由 Alembic 的 script 目錄算出，不寫死 revision id。
之後新增 revision 時，這些測試仍然成立。
"""

import asyncio

from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import create_async_engine

from appraisal.config import Settings
from appraisal.migrations import alembic_config, downgrade_to_base, upgrade_to_head
from tests.fixtures.database import create_test_database


def _head_revisions(url: URL) -> list[str]:
    script = ScriptDirectory.from_config(alembic_config(url))
    return sorted(script.get_heads())


async def _query_column(url: URL, sql: str) -> list[str]:
    """回傳查詢第一欄的結果，排序後比較，順序不影響結果。"""
    engine = create_async_engine(url)
    try:
        async with engine.connect() as connection:
            result = await connection.execute(text(sql))
            return sorted(str(value) for value in result.scalars().all())
    finally:
        await engine.dispose()


async def _applied_revisions(url: URL) -> list[str]:
    return await _query_column(url, "SELECT version_num FROM alembic_version")


async def _public_tables(url: URL) -> list[str]:
    return await _query_column(
        url,
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    )


async def test_empty_database_upgrades_downgrades_and_upgrades_again(
    base_settings: Settings,
) -> None:
    async with create_test_database(base_settings, migrate=False) as db_settings:
        url = db_settings.database_url()
        heads = _head_revisions(url)

        await asyncio.to_thread(upgrade_to_head, url)
        assert await _applied_revisions(url) == heads, (
            "upgrade to head should record the head revision"
        )

        await asyncio.to_thread(downgrade_to_base, url)
        assert await _applied_revisions(url) == [], (
            "downgrade to base should leave no applied revision"
        )

        await asyncio.to_thread(upgrade_to_head, url)
        assert await _applied_revisions(url) == heads, (
            "second upgrade should reach the head revision again"
        )


async def test_upgrade_on_head_database_keeps_revision_and_schema(base_settings: Settings) -> None:
    async with create_test_database(base_settings) as db_settings:
        url = db_settings.database_url()
        heads = _head_revisions(url)
        applied_before = await _applied_revisions(url)
        tables_before = await _public_tables(url)
        assert applied_before == heads, "precondition: the database should already be at head"

        await asyncio.to_thread(upgrade_to_head, url)

        assert await _applied_revisions(url) == applied_before, (
            "upgrade on a head database should not change the revision"
        )
        assert await _public_tables(url) == tables_before, (
            "upgrade on a head database should not change the schema"
        )
