"""檢核訊息用的格式化（對應舊版 core/model.js 的 fmt、pct，以及 JS 字串相加、比較的語意）。"""

import math
from decimal import ROUND_HALF_UP, Decimal, localcontext
from typing import Any

from appraisal.domain.jsnum import js_str, to_fixed, to_number

DASH = "—"
MINUS = "−"  # U+2212，pct 用


def fmt(v: Any, d: int = 0) -> str:
    """對應 fmt(v, d)：Number(v).toLocaleString('zh-TW', 固定 d 位小數)；空值與非數字得「—」。

    ICU 依最短十進位表示做「遠離 0」的四捨五入（1.005 得 1.01，和 toFixed 不同），
    負零顯示為「-0」，小數位數不足時補零。
    """
    if v is None or v == "":
        return DASH
    x = to_number(v)
    if math.isnan(x):
        return DASH
    if math.isinf(x):
        return "∞" if x > 0 else "-∞"
    neg = math.copysign(1.0, x) < 0
    q = Decimal(1).scaleb(-d)
    with localcontext() as ctx:
        ctx.prec = 400
        dec = Decimal(repr(abs(x))).quantize(q, rounding=ROUND_HALF_UP)
    text = format(dec, ",f")
    return ("-" if neg else "") + text


def pct(v: Any, d: int | None = None) -> str:
    """對應 pct(v, d)：帶正負號的百分比，負號用 U+2212；d 預設 1 位。"""
    if v is None:
        return DASH
    x = to_number(v)
    if math.isnan(x):
        return DASH
    s = to_fixed(abs(x), 1 if d is None else d)
    return ("+" if x > 0 else MINUS if x < 0 else "") + s + "%"


def cat(x: Any) -> str:
    """JS 字串相加時單一值的字串化：字串原樣、數字用 String(number)、空值為 null／undefined。"""
    if isinstance(x, str):
        return x
    if x is None:
        return "null"
    if isinstance(x, (bool, int, float)):
        return js_str(x)
    return str(x)


def num_or0(x: Any) -> float:
    """對應 Number(x)||0（與 jsnum.n 不同：Infinity 保留）。"""
    v = to_number(x)
    return 0.0 if math.isnan(v) or v == 0 else v


def num_gt0(x: Any) -> bool:
    """對應 Number(x)>0。"""
    return to_number(x) > 0


def cmp_num(x: Any) -> float:
    """比較用的數值：None（JSON 裡的 NaN）與缺值當 NaN，所有比較為假，同 JS 的 NaN。"""
    return math.nan if x is None else to_number(x)


def ge(a: Any, b: Any) -> bool:
    """對應 a >= b（NaN 為假）。"""
    return cmp_num(a) >= cmp_num(b)


def gt(a: Any, b: Any) -> bool:
    """對應 a > b（NaN 為假）。"""
    return cmp_num(a) > cmp_num(b)


def lt(a: Any, b: Any) -> bool:
    """對應 a < b（NaN 為假）。"""
    return cmp_num(a) < cmp_num(b)
