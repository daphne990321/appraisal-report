"""Alembic 的同步輔助函式，讓啟動程序與測試用同一種方式執行 migration。

這些函式內部用 asyncio.run() 執行 async migration，不能在執行中的 event loop 裡直接呼叫；
async 的呼叫端請用 asyncio.to_thread()。
"""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy.engine import URL

# 後端根目錄（容器內是 /app），alembic.ini 與 alembic/ 在這裡
BACKEND_ROOT = Path(__file__).resolve().parents[2]


def alembic_config(database_url: URL) -> Config:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    # 用 attributes 傳 URL 物件，避免經過 ini 文字而遮掉密碼
    config.attributes["database_url"] = database_url
    return config


def upgrade_to_head(database_url: URL) -> None:
    command.upgrade(alembic_config(database_url), "head")


def downgrade_to_base(database_url: URL) -> None:
    command.downgrade(alembic_config(database_url), "base")
