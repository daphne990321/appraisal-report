"""計算模組共用的 JS 語意小工具：除以零、次方、假值、陣列加總。"""

import math
from collections.abc import Callable, Iterable
from typing import Any

from appraisal.domain.jsnum import n


def truthy(x: Any) -> bool:
    """JS 的真值判斷（空字串、None、0、False、NaN 為假）。"""
    if x is None or x is False:
        return False
    if isinstance(x, str):
        return x != ""
    if isinstance(x, (int, float)):
        return not (x == 0 or (isinstance(x, float) and math.isnan(x)))
    return True


def missing_or_empty(d: dict[str, Any], key: str) -> bool:
    """對應 JS 的 `d.key === undefined || d.key === ''`（None 不算 undefined）。"""
    return key not in d or (isinstance(d[key], str) and d[key] == "")


def js_div(a: float, b: float) -> float:
    """對應 JS 的除法：除以零得 Infinity 或 NaN，不拋例外。"""
    if b == 0:
        if a == 0 or math.isnan(a):
            return math.nan
        return math.copysign(math.inf, a) * math.copysign(1.0, b)
    return a / b


def js_pow(a: float, b: float) -> float:
    """對應 Math.pow：負數的小數次方得 NaN、溢位得 Infinity，不拋例外。"""
    try:
        return math.pow(a, b)
    except ZeroDivisionError:
        return math.inf
    except ValueError:
        if a == 0:
            return math.inf
        return math.nan
    except OverflowError:
        return math.inf


def js_sum(arr: Iterable[Any], f: Callable[[Any], Any] | None = None) -> float:
    """對應舊版 sum(arr, f)：每項先過 n() 再加總。"""
    total = 0.0
    for x in arr:
        total += n(f(x) if f else x)
    return total
