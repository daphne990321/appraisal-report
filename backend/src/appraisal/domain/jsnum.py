"""舊版 JavaScript 的數值語意（n、Math.round、toFixed、String(number)）。

估價核心要和舊版逐位相同，所以這裡重現 JS 的行為，而不是用 Python 習慣的寫法。
"""

import math
import re
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

# JS 的 Number("...") 可接受的字串：十進位、科學記號、0x／0o／0b 前綴
_DECIMAL_RE = re.compile(r"[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?")
_RADIX_RE = re.compile(r"0([xX][0-9a-fA-F]+|[oO][0-7]+|[bB][01]+)")
# JS 的 trim 會去掉的空白（含全形空白與 BOM）
_JS_SPACES = " \t\n\r\v\f           " + ("      　﻿")


def _to_number(x: Any) -> float:
    """對應 JS 的 Number(x)；無法解析回傳 nan。"""
    if x is None:
        return 0.0
    if isinstance(x, bool):
        return 1.0 if x else 0.0
    if isinstance(x, (int, float)):
        try:
            return float(x)
        except OverflowError:
            return math.inf if x > 0 else -math.inf
    if isinstance(x, str):
        s = x.strip(_JS_SPACES)
        if s == "":
            return 0.0
        if _DECIMAL_RE.fullmatch(s):
            return float(s)
        if s in ("Infinity", "+Infinity"):
            return math.inf
        if s == "-Infinity":
            return -math.inf
        if _RADIX_RE.fullmatch(s):
            return float(int(s, 0))
        return math.nan
    return math.nan


def to_number(x: Any) -> float:
    """對應 JS 的 Number(x)：無法解析得 nan，不像 n() 把 nan 換成 0。"""
    return _to_number(x)


def n(x: Any) -> float:
    """對應舊版 n(x)：Number(x)，不是有限數字就當 0。"""
    v = _to_number(x)
    return v if math.isfinite(v) else 0.0


def js_round(x: float) -> float:
    """對應 Math.round：四捨五入，.5 往正無限大（-2.5 → -2，2.5 → 3）。

    用精確的 floor 與差值判斷，避免 floor(x + 0.5) 在 0.49999999999999994 的誤差。
    """
    if not math.isfinite(x):
        return float(x)
    f = math.floor(x)
    return float(f + 1) if x - f >= 0.5 else float(f)


def round_to(x: float, dec: float) -> float:
    """對應 roundTo(x, dec)：先乘再 js_round 再除，保留舊版浮點誤差。"""
    p = math.pow(10, dec)
    return js_round(x * p) / p


def r2(x: float) -> float:
    """對應 r2(x)：Math.round(x*100)/100。"""
    return js_round(x * 100) / 100


def to_fixed(x: float, digits: int = 0) -> str:
    """對應 Number.prototype.toFixed：依 IEEE 754 精確值四捨五入（.5 遠離 0）。"""
    x = float(x)
    if math.isnan(x):
        return "NaN"
    if abs(x) >= 1e21:
        return js_str(x)
    if x == 0:
        x = 0.0  # JS 的 (-0).toFixed() 沒有負號
    q = Decimal(1).scaleb(-digits)
    d = Decimal(x).quantize(q, rounding=ROUND_HALF_UP)
    return format(d, "f")


def js_str(x: Any) -> str:
    """對應 String(number)：整數不帶 .0，用最短表示，過大過小用 e 記法。"""
    if isinstance(x, bool):
        return "true" if x else "false"
    if isinstance(x, int) and abs(x) < 10**21:
        return str(x)
    v = float(x)
    if math.isnan(v):
        return "NaN"
    if math.isinf(v):
        return "Infinity" if v > 0 else "-Infinity"
    if v == 0:
        return "0"
    sign = "-" if v < 0 else ""
    digits_t = Decimal(repr(abs(v))).as_tuple()
    digits = "".join(map(str, digits_t.digits)).rstrip("0") or "0"
    # 數值 = 0.digits × 10^point
    point = len(digits_t.digits) + int(digits_t.exponent)
    k = len(digits)
    if k <= point <= 21:
        return sign + digits + "0" * (point - k)
    if 0 < point <= 21:
        return sign + digits[:point] + "." + digits[point:]
    if -6 < point <= 0:
        return sign + "0." + "0" * (-point) + digits
    e = point - 1
    exp = ("+" if e >= 0 else "-") + str(abs(e))
    mant = digits if k == 1 else digits[0] + "." + digits[1:]
    return sign + mant + "e" + exp
