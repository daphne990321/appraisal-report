"""案件文件的版本升級。

舊版 db 的 `v` 是 5，作為本系統的起點。以後案件形狀改變時：
把 CURRENT_SCHEMA_VERSION 加 1，並在 _UPGRADES 補一個「從 n 升到 n+1」的函式。
"""

import copy
from collections.abc import Callable
from typing import Any

CURRENT_SCHEMA_VERSION = 5

# 版本 n → 把 n 版的文件升成 n+1 版的函式（目前沒有，起點就是 5）
_UPGRADES: dict[int, Callable[[dict[str, Any]], dict[str, Any]]] = {}


def upgrade_case_document(doc: dict[str, Any], from_version: int | None = None) -> dict[str, Any]:
    """把案件文件升到目前版本；已是目前版本時回傳內容相同的複本。

    案件文件本身沒有版本欄位，版本由外層（資料表的 schema_version 欄位）提供，
    沒給就當作目前版本。比目前更新的版本無法處理，丟出 ValueError。
    """
    version = CURRENT_SCHEMA_VERSION if from_version is None else from_version
    if version > CURRENT_SCHEMA_VERSION:
        raise ValueError(f"unsupported schema version: {version}")
    result = copy.deepcopy(doc)
    while version < CURRENT_SCHEMA_VERSION:
        step = _UPGRADES.get(version)
        if step is None:
            raise ValueError(f"no upgrade step from schema version {version}")
        result = step(result)
        version += 1
    return result
