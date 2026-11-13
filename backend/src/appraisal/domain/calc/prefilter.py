"""實價登錄的 SQL 預篩條件：只取 filteredSales 一定會排除的規則，所以不會比完整規則嚴格。"""

import math
from dataclasses import dataclass
from datetime import date
from typing import Any

from appraisal.domain.constants import is_land_kind
from appraisal.domain.jsnum import n


@dataclass(frozen=True)
class SalesPrefilter:
    """預篩條件；None 代表該項不限制。

    date_from、date_to 是 YYYY-MM（含）。日期不是 YYYY-MM 形式的資料，舊版月數差當 0 而不排除，
    所以 include_undated 為真，呼叫端的查詢要把這類資料一併取出。
    """

    landsale: bool
    county: str | None = None
    district: str | None = None
    date_from: str | None = None
    date_to: str | None = None
    include_undated: bool = True


def _ym_text(index: int) -> str:
    """月份序號（年 × 12 + 月）轉成 YYYY-MM。"""
    year, month0 = divmod(index - 1, 12)
    return f"{year:04d}-{month0 + 1:02d}"


def _date_range(price_date: str, months: Any) -> tuple[str | None, str | None]:
    """依價格日期與「往前幾個月」算出 YYYY-MM 範圍；舊版不排除時回傳 None。"""
    parts = price_date.split("-")
    if len(parts) < 2:
        return None, None
    try:
        limit = float(months)
    except (TypeError, ValueError):
        return None, None  # 舊版比較結果為 NaN，不會排除任何資料
    if not math.isfinite(limit):
        return None, None
    idx = int(n(parts[0]) * 12 + n(parts[1]))
    return _ym_text(idx - math.floor(limit)), _ym_text(idx)


def prefilter(case: dict[str, Any], model: dict[str, Any], today: date) -> SalesPrefilter:
    """依案件與模型的選取規則產生預篩條件。"""
    rule = model["select"]
    b = case["basic"]
    price_date = str(b.get("priceDate") or today.isoformat())
    date_from, date_to = _date_range(price_date, rule.get("months"))
    return SalesPrefilter(
        landsale=is_land_kind(case.get("kind")),
        county=b["county"] if rule.get("sameCounty") and b.get("county") else None,
        district=b["district"] if rule.get("sameDistrict") and b.get("district") else None,
        date_from=date_from,
        date_to=date_to,
    )
