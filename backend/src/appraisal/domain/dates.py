"""舊版 monthsBetween、yearsBetween 與 JS `new Date(字串)` 的解析。"""

import math
import re
from datetime import date
from typing import Any

from appraisal.domain.jsnum import js_str, n

_MS_PER_DAY = 86_400_000
_YEAR_MS = 365.2425 * 24 * 3600 * 1000

# 支援 YYYY、YYYY-MM、YYYY-MM-DD（V8 也接受 1～2 位數與 / 分隔），可接時間與時區
_DATE_RE = re.compile(
    r"(\d{4})(?:[-/](\d{1,2})(?:[-/](\d{1,2}))?)?"
    r"(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?\s*(Z|[+-]\d{2}:?\d{2})?)?"
)


def _falsy(x: Any) -> bool:
    """JS 的假值：空字串、None、0、False、NaN。"""
    if x is None or x is False:
        return True
    if isinstance(x, str):
        return x == ""
    if isinstance(x, (int, float)):
        return x == 0 or (isinstance(x, float) and math.isnan(x))
    return False


def months_between(ym: Any, price_date: Any) -> float:
    """對應 monthsBetween：兩個 YYYY-MM（或 YYYY-MM-DD）相差的月數，只看年月。"""
    if _falsy(ym) or _falsy(price_date):
        return 0.0
    a = js_str(ym).split("-") if not isinstance(ym, str) else ym.split("-")
    b = js_str(price_date).split("-") if not isinstance(price_date, str) else price_date.split("-")
    if len(a) < 2 or len(b) < 2:
        return 0.0
    return (n(b[0]) - n(a[0])) * 12 + (n(b[1]) - n(a[1]))


def _parse_ms(s: str) -> float | None:
    """解析日期字串成 UTC 毫秒；無法解析回傳 None（JS 的 Invalid Date）。

    V8 的日期部分日數 1～31 都接受（2 月 30 日會順延到 3 月），這裡照做。
    沒有時區的日期時間，JS 當本地時間；這裡一律當 UTC，兩個日期都沒有時區時相減結果相同。
    """
    m = _DATE_RE.fullmatch(s.strip())
    if not m:
        return None
    y, mo, d = int(m[1]), int(m[2] or 1), int(m[3] or 1)
    if not (1 <= mo <= 12 and 1 <= d <= 31):
        return None
    ms = float((date(y, mo, 1).toordinal() - date(1970, 1, 1).toordinal() + d - 1) * _MS_PER_DAY)
    if m[4] is not None:
        hh, mm, ss = int(m[4]), int(m[5]), int(m[6] or 0)
        frac = int((m[7] or "0").ljust(3, "0")[:3])
        if mm > 59 or ss > 59 or hh > 24 or (hh == 24 and (mm or ss or frac)):
            return None
        ms += ((hh * 60 + mm) * 60 + ss) * 1000 + frac
        z = m[8]
        if z and z != "Z":
            off = z[1:].replace(":", "")
            delta = (int(off[:2]) * 60 + int(off[2:])) * 60_000
            ms -= delta if z[0] == "+" else -delta
    return ms


def _date_ms(d: Any) -> float | None:
    """對應 new Date(String(d).length===7 ? d+'-01' : d) 取毫秒。"""
    s = d if isinstance(d, str) else js_str(d)
    if len(s) == 7:
        s += "-01"
    return _parse_ms(s)


def years_between(d1: Any, d2: Any, exact: bool = False) -> float:
    """對應 yearsBetween：d1 到 d2 的年數（以 365.2425 天計），不足 0 取 0；預設無條件捨去。"""
    if _falsy(d1) or _falsy(d2):
        return 0.0
    a, b = _date_ms(d1), _date_ms(d2)
    if a is None or b is None:
        return 0.0
    y = max(0.0, (b - a) / _YEAR_MS)
    return y if exact else float(math.floor(y))
