"""SPA 靜態檔服務與 404 行為。"""

from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI

from appraisal.api.spa import mount_spa
from appraisal.config import Settings
from tests.fixtures.app_client import open_running_app

INDEX_HTML = b"<!doctype html><title>spa-test-index</title>"
ASSET_PATH = "/assets/app-abc123.js"
ASSET_JS = b"console.log('spa-test-asset');"
FAVICON = b"spa-test-favicon-bytes"
SECRET = b"spa-test-secret-outside-static"


@pytest.fixture
def static_dir(tmp_path: Path) -> Path:
    """假的前端建置目錄：index.html、一個含 hash 的資源、一個放在根目錄的檔案。"""
    root = tmp_path / "static"
    (root / "assets").mkdir(parents=True)
    (root / "index.html").write_bytes(INDEX_HTML)
    (root / "assets" / "app-abc123.js").write_bytes(ASSET_JS)
    (root / "favicon.ico").write_bytes(FAVICON)
    return root


@pytest_asyncio.fixture
async def spa_client(test_settings: Settings, static_dir: Path) -> AsyncIterator[httpx.AsyncClient]:
    settings = test_settings.model_copy(update={"static_dir": static_dir})
    async with open_running_app(settings) as running:
        yield running.client


@pytest_asyncio.fixture
async def api_only_client(test_settings: Settings) -> AsyncIterator[httpx.AsyncClient]:
    settings = test_settings.model_copy(update={"static_dir": None})
    async with open_running_app(settings) as running:
        yield running.client


def _assert_json_error(response: httpx.Response, status: int, detail: str, label: str) -> None:
    assert response.status_code == status, (
        f"{label}: expected status {status}, got {response.status_code}"
    )
    content_type = response.headers["content-type"]
    assert content_type.startswith("application/json"), (
        f"{label}: expected a JSON response, got content-type {content_type!r}"
    )
    assert response.json() == {"detail": detail}, f"{label}: unexpected body {response.text!r}"
    assert INDEX_HTML not in response.content, f"{label}: the frontend page must not be served"


async def test_deep_page_path_serves_index_with_no_cache_for_get_and_head(
    spa_client: httpx.AsyncClient,
) -> None:
    get_response = await spa_client.get("/cases/115-0001/report")
    assert get_response.status_code == 200, (
        f"GET should serve index, got {get_response.status_code}"
    )
    assert get_response.content == INDEX_HTML
    assert get_response.headers["cache-control"] == "no-cache"

    head_response = await spa_client.head("/cases/115-0001/report")
    assert head_response.status_code == 200, (
        f"HEAD should serve index, got {head_response.status_code}"
    )
    assert head_response.headers == get_response.headers, (
        "HEAD should return the same headers as GET"
    )
    assert head_response.content == b"", "HEAD should return no body"


async def test_built_asset_is_served_with_long_lived_immutable_cache(
    spa_client: httpx.AsyncClient,
) -> None:
    response = await spa_client.get(ASSET_PATH)

    assert response.status_code == 200, (
        f"existing asset should be served, got {response.status_code}"
    )
    assert response.content == ASSET_JS
    cache_control = response.headers["cache-control"]
    assert "max-age=31536000" in cache_control, f"unexpected cache-control {cache_control!r}"
    assert "immutable" in cache_control, f"unexpected cache-control {cache_control!r}"


async def test_api_mcp_and_health_paths_return_json_errors_not_the_frontend(
    spa_client: httpx.AsyncClient,
) -> None:
    for path in ["/api/v1/does-not-exist", "/api/other", "/mcp/x", "/healthz/x"]:
        _assert_json_error(await spa_client.get(path), 404, "Not Found", f"GET {path}")

    for method, path in [
        ("POST", "/api/v1/x"),
        ("PUT", "/api/v1/x"),
        ("DELETE", "/api/v1/x"),
        ("POST", "/cases/115-0001"),
    ]:
        _assert_json_error(
            await spa_client.request(method, path), 404, "Not Found", f"{method} {path}"
        )

    _assert_json_error(
        await spa_client.post("/healthz"), 405, "Method Not Allowed", "POST /healthz"
    )


async def test_missing_asset_and_missing_file_return_404_not_the_frontend(
    spa_client: httpx.AsyncClient,
) -> None:
    _assert_json_error(
        await spa_client.get("/assets/missing.js"), 404, "Not Found", "GET /assets/missing.js"
    )
    _assert_json_error(await spa_client.get("/missing.png"), 404, "Not Found", "GET /missing.png")


async def test_without_static_dir_only_api_and_health_are_served(
    api_only_client: httpx.AsyncClient,
) -> None:
    _assert_json_error(await api_only_client.get("/"), 404, "Not Found", "GET /")
    _assert_json_error(await api_only_client.get("/cases/x"), 404, "Not Found", "GET /cases/x")

    health = await api_only_client.get("/healthz")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}

    _assert_json_error(
        await api_only_client.post("/healthz"), 405, "Method Not Allowed", "POST /healthz"
    )


async def test_static_root_file_is_returned_and_paths_outside_static_dir_are_not(
    spa_client: httpx.AsyncClient, static_dir: Path
) -> None:
    secret_file = static_dir.parent / "secret.txt"
    secret_file.write_bytes(SECRET)
    # 放在 static_dir 內、但實際指向外面的符號連結：解析後不在 static_dir 之內，不能當成檔案回傳。
    (static_dir / "leak.txt").symlink_to(secret_file)

    favicon = await spa_client.get("/favicon.ico")
    assert favicon.status_code == 200, f"root file should be served, got {favicon.status_code}"
    assert favicon.content == FAVICON
    assert favicon.headers["cache-control"] == "no-cache"

    leak = await spa_client.get("/leak.txt")
    assert SECRET not in leak.content, "a symlink pointing outside static_dir must not be served"
    assert leak.status_code == 404, f"expected 404 for escaping symlink, got {leak.status_code}"

    # 百分比編碼的 ../ 在解碼後會變成 ../secret.txt，也不能讀到外面的檔案。
    encoded = await spa_client.get("/%2e%2e%2fsecret.txt")
    assert SECRET not in encoded.content, "an encoded traversal path must not be served"
    assert encoded.status_code == 404, f"expected 404 for traversal, got {encoded.status_code}"


def test_mount_spa_rejects_static_dir_without_index_html(tmp_path: Path) -> None:
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()

    with pytest.raises(RuntimeError, match=r"index\.html"):
        mount_spa(FastAPI(), empty_dir)
