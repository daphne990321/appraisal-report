"""提供建置好的前端，並讓沒有對應路由的請求得到一致的回應。"""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.responses import FileResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.staticfiles import StaticFiles
from starlette.types import Scope

# 後端端點一律放在這些第一段路徑之下；新增頂層前綴時要一併加進來
RESERVED_PREFIXES = frozenset({"api", "mcp", "healthz", "readyz", "assets", "legacy"})

_IMMUTABLE_CACHE = "public, max-age=31536000, immutable"
_NO_CACHE = "no-cache"


class ImmutableStaticFiles(StaticFiles):
    """成功的回應加上長期快取；Vite 產生的檔名含內容 hash，所以可以這樣做。"""

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)
        if response.status_code < 400:
            response.headers["Cache-Control"] = _IMMUTABLE_CACHE
        return response


class NoCacheStaticFiles(StaticFiles):
    """每次都向伺服器確認是否有新版；用在檔名不含 hash 的檔案。"""

    async def get_response(self, path: str, scope: Scope) -> Response:
        response = await super().get_response(path, scope)
        if response.status_code < 400:
            response.headers["Cache-Control"] = _NO_CACHE
        return response


def mount_spa(app: FastAPI, static_dir: Path) -> None:
    """掛載 /assets 並註冊 404 handler。缺少 index.html 或 assets 目錄時丟出 RuntimeError。

    static_dir 下有 legacy/ 目錄時，另外把它掛在 /legacy/（過渡期的舊版單頁）。
    /legacy 沒有結尾斜線時由 router 導向 /legacy/。
    """
    index_file = static_dir / "index.html"
    if not index_file.is_file():
        raise RuntimeError(f"SPA index.html not found in {static_dir}")
    root = static_dir.resolve()

    # assets 目錄不存在時，StaticFiles 在建立時就丟出 RuntimeError（訊息含目錄路徑），讓啟動失敗
    app.mount("/assets", ImmutableStaticFiles(directory=static_dir / "assets"), name="assets")

    legacy_dir = static_dir / "legacy"
    if legacy_dir.is_dir():
        app.mount("/legacy", NoCacheStaticFiles(directory=legacy_dir, html=True), name="legacy")

    def root_file(name: str) -> Path | None:
        """根目錄下已存在的檔案；解析後離開 static_dir 的路徑當成不存在。"""
        try:
            candidate = (root / name).resolve()
            if candidate.is_relative_to(root) and candidate.is_file():
                return candidate
        except (OSError, ValueError):
            pass
        return None

    async def spa_not_found_handler(request: Request, exc: Exception) -> Response:
        # 只處理 404；其他狀態碼（包含 405）交給預設 handler
        assert isinstance(exc, StarletteHTTPException)
        if exc.status_code != 404 or request.method not in ("GET", "HEAD"):
            return await http_exception_handler(request, exc)
        relative = request.url.path.lstrip("/")
        if relative.split("/", 1)[0] in RESERVED_PREFIXES:
            return await http_exception_handler(request, exc)
        if relative and "/" not in relative and (file := root_file(relative)) is not None:
            return FileResponse(file, headers={"Cache-Control": _NO_CACHE})
        if "." in relative.rsplit("/", 1)[-1]:
            return await http_exception_handler(request, exc)
        return FileResponse(index_file, headers={"Cache-Control": _NO_CACHE})

    app.add_exception_handler(StarletteHTTPException, spa_not_found_handler)
