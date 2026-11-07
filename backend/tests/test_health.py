"""存活檢查與可服務檢查。"""

import time

import httpx

from appraisal.config import Settings
from tests.fixtures.app_client import open_running_app
from tests.fixtures.network import unresponsive_listener, unused_local_port


async def test_liveness_reports_ok_while_database_is_unreachable(base_settings: Settings) -> None:
    unreachable = base_settings.model_copy(
        update={"postgres_host": "127.0.0.1", "postgres_port": unused_local_port()}
    )

    async with open_running_app(unreachable) as running:
        response = await running.client.get("/healthz")

    assert response.status_code == 200, (
        f"liveness should not depend on the database, got {response.status_code}"
    )
    assert response.json() == {"status": "ok"}


async def test_readiness_reports_ok_while_database_is_reachable(client: httpx.AsyncClient) -> None:
    response = await client.get("/readyz")

    assert response.status_code == 200, f"readiness should be ok, got {response.status_code}"
    assert response.json() == {"status": "ok"}


async def test_readiness_gives_up_within_three_seconds_on_silent_database(
    base_settings: Settings,
) -> None:
    with unresponsive_listener() as port:
        silent = base_settings.model_copy(
            update={"postgres_host": "127.0.0.1", "postgres_port": port}
        )
        async with open_running_app(silent) as running:
            started = time.monotonic()
            response = await running.client.get("/readyz")
            elapsed = time.monotonic() - started

    assert response.status_code == 503, (
        f"readiness should be unavailable, got {response.status_code}"
    )
    assert response.json() == {"status": "unavailable"}, (
        "the readiness body should not carry host names or error text"
    )
    assert elapsed < 3.0, f"readiness should answer within 3 seconds, took {elapsed:.2f}s"
