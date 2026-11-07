"""啟動程序（python -m appraisal.startup）的結束碼與輸出。

每個案例都以 subprocess 執行，環境變數只包含該案例設定的值。
"""

import asyncio
import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from appraisal.config import Settings
from tests.fixtures.database import create_test_database
from tests.fixtures.network import unresponsive_listener, unused_local_port
from tests.fixtures.settings_environment import SETTINGS_ENVIRONMENT_NAMES

PASSWORD = "Quartz-Zebra-7731-secret"


def _run_startup(
    cwd: Path, variables: dict[str, str], *, timeout: float
) -> subprocess.CompletedProcess[str]:
    environment = {
        name: value for name, value in os.environ.items() if name not in SETTINGS_ENVIRONMENT_NAMES
    }
    environment.update(variables)
    return subprocess.run(
        [sys.executable, "-m", "appraisal.startup"],
        cwd=cwd,
        env=environment,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )


def _database_variables(
    *, host: str, port: int, database: str, user: str, password: str
) -> dict[str, str]:
    return {
        "POSTGRES_HOST": host,
        "POSTGRES_PORT": str(port),
        "POSTGRES_DB": database,
        "POSTGRES_USER": user,
        "POSTGRES_PASSWORD": password,
    }


async def _record_unknown_revision(settings: Settings) -> None:
    """建立 alembic_version 表，並寫入 Alembic 不認得的 revision。"""
    engine = create_async_engine(settings.database_url())
    try:
        async with engine.begin() as connection:
            await connection.execute(
                text(
                    "CREATE TABLE alembic_version ("
                    "version_num VARCHAR(32) NOT NULL, "
                    "CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"
                )
            )
            await connection.execute(
                text("INSERT INTO alembic_version (version_num) VALUES ('no-such-revision')")
            )
    finally:
        await engine.dispose()


def test_missing_password_exits_with_code_two_and_names_the_variable(tmp_path: Path) -> None:
    variables = {"POSTGRES_USER": "appraisal", "POSTGRES_DB": "appraisal"}

    result = _run_startup(tmp_path, variables, timeout=60)

    assert result.returncode == 2, (
        f"missing settings should exit with code 2, got {result.returncode}"
    )
    assert "POSTGRES_PASSWORD" in result.stderr, (
        f"stderr should name the missing variable, got {result.stderr!r}"
    )


def test_unreachable_database_exit_output_never_contains_password(tmp_path: Path) -> None:
    variables = _database_variables(
        host="127.0.0.1",
        port=unused_local_port(),
        database="appraisal",
        user="appraisal",
        password=PASSWORD,
    ) | {"STARTUP_DB_WAIT_SECONDS": "1"}

    result = _run_startup(tmp_path, variables, timeout=60)

    assert result.returncode == 3, (
        f"an unreachable database should exit with code 3, got {result.returncode}"
    )
    combined_output = result.stdout + result.stderr
    assert PASSWORD not in combined_output, "the startup output must not contain the password"


def test_silent_database_makes_startup_exit_with_code_three_within_ten_seconds(
    tmp_path: Path,
) -> None:
    with unresponsive_listener() as port:
        variables = _database_variables(
            host="127.0.0.1",
            port=port,
            database="appraisal",
            user="appraisal",
            password="unit-test-password",
        ) | {"STARTUP_DB_WAIT_SECONDS": "1"}

        try:
            result = _run_startup(tmp_path, variables, timeout=10)
        except subprocess.TimeoutExpired:
            pytest.fail("the startup process did not exit within 10 seconds")

    assert result.returncode == 3, (
        f"a silent database should exit with code 3, got {result.returncode}"
    )


async def test_unknown_recorded_revision_exits_with_code_four_before_serving(
    base_settings: Settings, tmp_path: Path
) -> None:
    async with create_test_database(base_settings, migrate=False) as db_settings:
        await _record_unknown_revision(db_settings)
        variables = _database_variables(
            host=db_settings.postgres_host,
            port=db_settings.postgres_port,
            database=db_settings.postgres_db,
            user=db_settings.postgres_user,
            password=db_settings.postgres_password.get_secret_value(),
        )

        result = await asyncio.to_thread(_run_startup, tmp_path, variables, timeout=60)

    assert result.returncode == 4, (
        f"a failed migration should exit with code 4, got {result.returncode}"
    )
    combined_output = result.stdout + result.stderr
    assert "Uvicorn running" not in combined_output, (
        "the server must not start after a failed migration"
    )
