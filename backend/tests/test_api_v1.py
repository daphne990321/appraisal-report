"""API v1 router 的擴充點。"""

from collections.abc import AsyncIterator

import httpx
import pytest
import pytest_asyncio

from appraisal.api import v1
from appraisal.config import Settings
from tests.fixtures.app_client import open_running_app


async def _extension_endpoint() -> dict[str, str]:
    return {"served_by": "extension-point"}


@pytest_asyncio.fixture
async def extended_client(
    monkeypatch: pytest.MonkeyPatch, test_settings: Settings
) -> AsyncIterator[httpx.AsyncClient]:
    # include_router 會在建立 app 時複製路由，所以要先加入端點、再建立 app。
    # routes 清單先換成副本，測試結束時 monkeypatch 會還原原本的清單，不影響其他測試。
    monkeypatch.setattr(v1.router, "routes", list(v1.router.routes))
    v1.router.add_api_route("/x", _extension_endpoint, methods=["GET"])

    async with open_running_app(test_settings) as running:
        yield running.client


async def test_endpoint_added_to_extension_point_is_served_only_under_api_v1_prefix(
    extended_client: httpx.AsyncClient,
) -> None:
    prefixed = await extended_client.get("/api/v1/x")
    assert prefixed.status_code == 200, f"/api/v1/x should be served, got {prefixed.status_code}"
    assert prefixed.json() == {"served_by": "extension-point"}

    unprefixed = await extended_client.get("/x")
    assert unprefixed.status_code == 404, (
        f"the endpoint should not answer outside /api/v1, got {unprefixed.status_code}"
    )
    assert unprefixed.json() == {"detail": "Not Found"}
