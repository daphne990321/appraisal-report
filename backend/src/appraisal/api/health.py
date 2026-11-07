"""存活與可服務檢查。"""

import asyncio
import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

logger = logging.getLogger(__name__)

READINESS_TIMEOUT_SECONDS = 2.0

router = APIRouter()


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    """存活檢查：不碰資料庫。"""
    return {"status": "ok"}


@router.get("/readyz")
async def readyz(request: Request) -> JSONResponse:
    """可服務檢查：在時限內透過 app.state.engine 執行 SELECT 1。

    失敗時只回固定內容，不含例外訊息或主機名稱。
    """
    try:
        async with asyncio.timeout(READINESS_TIMEOUT_SECONDS):
            async with request.app.state.engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("Readiness check failed: %s", type(exc).__name__)
        return JSONResponse({"status": "unavailable"}, status_code=503)
    return JSONResponse({"status": "ok"})
