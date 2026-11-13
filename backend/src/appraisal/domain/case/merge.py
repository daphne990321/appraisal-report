"""深層合併（對照舊版 core/model.js 的 deepMerge，全系統只有這一份）。"""

from typing import Any


def deep_merge(a: Any, b: Any) -> Any:
    """把 b 疊在 a 上：兩邊都是物件就逐 key 合併，其餘（陣列、None、數字、字串）直接用 b。

    不改動 a，回傳新的 dict；b 的葉節點不複製（和舊版一樣，回傳值可能與 b 共用內容）。
    """
    if not isinstance(b, dict):
        return b
    out: dict[str, Any] = dict(a) if isinstance(a, dict) else {}
    for key, value in b.items():
        current = a.get(key) if isinstance(a, dict) else None
        out[key] = deep_merge(current, value) if isinstance(current, dict) else value
    return out
