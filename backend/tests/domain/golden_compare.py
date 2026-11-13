"""golden 比對：依 design.md 的規則找出兩份 JSON 資料的差異。"""

import math
from typing import Any

REL_TOL = 1e-9
MAX_DIFFS = 30


def _is_number(x: Any) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _is_null(x: Any) -> bool:
    """None 與 nan／inf 都算 null（JS 的 JSON.stringify 會把它們轉成 null）。"""
    return x is None or (isinstance(x, float) and not math.isfinite(x))


def _floats_close(a: float, b: float) -> bool:
    return abs(a - b) <= REL_TOL * max(1.0, abs(a), abs(b))


def _type_name(x: Any) -> str:
    return type(x).__name__


def _compare(a: Any, b: Any, path: str, out: list[str], limit: int) -> None:
    if len(out) >= limit:
        return
    if _is_null(a) or _is_null(b):
        if not (_is_null(a) and _is_null(b)):
            out.append(f"{path}: expected {a!r}, actual {b!r}")
    elif isinstance(a, dict) and isinstance(b, dict):
        for key in sorted(set(a) | set(b)):
            _compare(a.get(key), b.get(key), f"{path}.{key}", out, limit)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            out.append(f"{path}: expected length {len(a)}, actual length {len(b)}")
            return
        for i, (x, y) in enumerate(zip(a, b, strict=True)):
            _compare(x, y, f"{path}[{i}]", out, limit)
    elif isinstance(a, bool) or isinstance(b, bool):
        if not (isinstance(a, bool) and isinstance(b, bool) and a == b):
            out.append(f"{path}: expected {a!r}, actual {b!r}")
    elif _is_number(a) and _is_number(b):
        both_int = isinstance(a, int) and isinstance(b, int)
        if not (a == b if both_int else _floats_close(float(a), float(b))):
            out.append(f"{path}: expected {a!r}, actual {b!r}")
    elif isinstance(a, str) and isinstance(b, str):
        if a != b:
            out.append(f"{path}: expected {a!r}, actual {b!r}")
    else:
        out.append(f"{path}: type mismatch, expected {_type_name(a)}, actual {_type_name(b)}")


def compare_golden(
    expected: Any, actual: Any, path: str = "$", limit: int = MAX_DIFFS
) -> list[str]:
    """回傳差異清單（含路徑），最多 limit 筆；空清單代表一致。"""
    out: list[str] = []
    _compare(expected, actual, path, out, limit)
    return out
