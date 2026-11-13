"""比較標的篩選與市場行情（對應舊版 core/model.js 的 filteredSales、marketStats 等）。

資料一律由呼叫端傳入（ReferenceData），這裡不讀資料庫、不讀時鐘；價格日期空白時用參數 today。
"""

import math
import re
from datetime import date
from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.calc.library import (
    ReferenceData,
    all_sales,
    lib_find,
    lvr_row_to_record,
    merge_lib,
    reference_from_db,
)
from appraisal.domain.calc.ols import ols
from appraisal.domain.calc.prefilter import SalesPrefilter, prefilter
from appraisal.domain.constants import is_land_kind
from appraisal.domain.dates import months_between, years_between
from appraisal.domain.jsnum import js_round, n, to_number

__all__ = [
    "ReferenceData",
    "SalesPrefilter",
    "all_sales",
    "area_of",
    "base_ping",
    "filtered_rents",
    "filtered_sales",
    "is_whole",
    "lib_find",
    "lvr_row_to_record",
    "market_stats",
    "merge_lib",
    "pd_of",
    "prefilter",
    "quantile",
    "reference_from_db",
    "rent_stats",
    "score_of",
    "subj",
    "zone_class",
]


def _num(d: dict[str, Any], key: str) -> float:
    """對應 JS 的 Number(d.key)：欄位不存在得 NaN（比較結果一律為假），空字串得 0。"""
    return to_number(d[key]) if key in d else math.nan


def pd_of(case: dict[str, Any], today: date) -> str:
    """價格日期；空白時用 today（不讀時鐘）。"""
    return str(case["basic"].get("priceDate") or today.isoformat())


def base_ping(case: dict[str, Any]) -> float:
    """土地案件以「基地」計價的地號面積合計（坪）。"""
    total = 0.0
    for p in case.get("parcels") or []:
        if not p.get("priceMode") or p.get("priceMode") == "base":
            share = 1 if p.get("share") is None or p.get("share") == "" else n(p["share"])
            total += n(p.get("areaM2")) * share / 3.30579
    return total


def area_of(case: dict[str, Any]) -> float:
    """標的面積（坪）：土地類用地號合計，其餘用建物面積。"""
    if is_land_kind(case.get("kind")):
        return base_ping(case)
    return n(case["basic"].get("area"))


def subj(case: dict[str, Any], today: date) -> dict[str, Any]:
    """勘估標的的屋齡、面積、樓層，供篩選與評分用。"""
    b = case["basic"]
    land = is_land_kind(case.get("kind"))
    return {
        "age": 0 if land else years_between(b.get("completed"), pd_of(case, today), True),
        "area": area_of(case),
        "floor": 0 if land else n(b.get("floorNum")),
        "totalFloors": n(b.get("totalFloors")),
        "land": land,
    }


def zone_class(z: Any) -> str:
    """使用分區歸類：住、商、工、農、其他；空白或 - 為空字串。"""
    s = "" if not truthy(z) else str(z)
    if not s or s == "-":
        return ""
    for key in ("住", "商", "工", "農"):
        if key in s:
            return key
    return "其他"


def score_of(
    x: dict[str, Any], case: dict[str, Any], r: dict[str, Any], pd: str, sv: dict[str, Any]
) -> float:
    """比較標的與勘估標的的相似度（0～100，越高越像）。"""
    m = abs(months_between(x.get("date"), pd))
    d_age = _num(r, "ageTol") if x.get("age") == "" else abs(n(x.get("age")) - sv["age"])
    d_area = abs(n(x.get("areaPing")) - sv["area"]) / sv["area"] * 100 if sv["area"] > 0 else 0.0
    if truthy(x.get("floorNum")) and truthy(sv["floor"]):
        d_floor = abs(n(x["floorNum"]) - sv["floor"])
    else:
        d_floor = _num(r, "floorTol")

    def cap(d: float, key: str) -> float:
        # Math.min(1, d / Math.max(1, Number(t) || 1))：d 為 NaN 時結果為 NaN
        t = _num(r, key)
        q = d / max(1.0, t if truthy(t) else 1.0)
        return math.nan if math.isnan(q) else min(1.0, q)

    pen = (
        _num(r, "wDate") * cap(m, "months")
        + _num(r, "wAge") * cap(d_age, "ageTol")
        + _num(r, "wArea") * cap(d_area, "areaTolPct")
        + _num(r, "wFloor") * cap(d_floor, "floorTol")
    )
    road = case["basic"].get("road")
    on_road = truthy(road) and truthy(x.get("road")) and str(road) in str(x["road"])
    pen += 0 if on_road else _num(r, "wRoad")
    score = js_round(100 - pen)
    return math.nan if math.isnan(score) else max(0.0, score)


def _keeps_sale(
    x: dict[str, Any], b: dict[str, Any], r: dict[str, Any], sv: dict[str, Any], zc: str, pd: str
) -> bool:
    """一筆買賣資料是否通過全部選取條件。"""
    if not n(x.get("unitWan")) > 0:
        return False
    if sv["land"] != (x.get("kind") == "landsale"):
        return False
    if r.get("sameCounty") and b.get("county") and x.get("county") != b["county"]:
        return False
    if r.get("sameDistrict") and b.get("district") and x.get("district") != b["district"]:
        return False
    if not sv["land"] and r.get("sameType") and x.get("type") != b.get("btype"):
        return False
    if r.get("sameZone") and zc and x.get("zone") and zone_class(x["zone"]) != zc:
        return False
    m = months_between(x.get("date"), pd)
    if m < 0 or m > _num(r, "months"):
        return False
    if (
        not sv["land"]
        and x.get("age") != ""
        and abs(n(x.get("age")) - sv["age"]) > _num(r, "ageTol")
    ):
        return False
    if sv["area"] > 0 and abs(n(x.get("areaPing")) - sv["area"]) / sv["area"] * 100 > _num(
        r, "areaTolPct"
    ):
        return False
    floor_gap = abs(n(x.get("floorNum")) - sv["floor"])
    if truthy(x.get("floorNum")) and truthy(sv["floor"]) and floor_gap > _num(r, "floorTol"):
        return False
    if r.get("excludeSpecial") and truthy(x.get("special")):
        return False
    if r.get("excludePresale") and truthy(x.get("presale")):
        return False
    return not (truthy(r.get("keyword")) and str(r["keyword"]) not in str(x.get("addr", "")))


def filtered_sales(
    case: dict[str, Any], model: dict[str, Any], ref: ReferenceData, today: date
) -> list[dict[str, Any]]:
    """依模型選取規則篩出比較標的候選，加上相似度 score，依 score 高到低、日期新到舊排序。"""
    r = model["select"]
    b = case["basic"]
    pd = pd_of(case, today)
    sv = subj(case, today)
    zc = zone_class(b.get("zone"))
    kept = [x for x in all_sales(ref, model) if _keeps_sale(x, b, r, sv, zc, pd)]
    rows = [{**x, "score": score_of(x, case, r, pd, sv)} for x in kept]
    # 兩次穩定排序：先依日期新到舊，再依 score 高到低；與舊版比較函式的結果相同
    rows.sort(key=lambda x: x.get("date", ""), reverse=True)
    rows.sort(key=lambda x: x["score"], reverse=True)
    return rows


def is_whole(x: dict[str, Any]) -> bool:
    """租賃資料是否為整棟或分層出租。"""
    lease = x.get("lease")
    return not truthy(lease) or re.search("整棟|分層", str(lease)) is not None


def filtered_rents(
    case: dict[str, Any], model: dict[str, Any], ref: ReferenceData, today: date
) -> list[dict[str, Any]]:
    """依模型的租賃選取規則篩出租金資料，日期新到舊。"""
    r = model["rentSelect"]
    b = case["basic"]
    pd = pd_of(case, today)
    sv = subj(case, today)
    out = []
    for x in ref.rents:
        if not n(x.get("rentPerPing")) > 0:
            continue
        if r.get("sameCounty") and b.get("county") and x.get("county") != b["county"]:
            continue
        if r.get("sameDistrict") and b.get("district") and x.get("district") != b["district"]:
            continue
        if r.get("sameType") and x.get("type") != b.get("btype"):
            continue
        m = months_between(x.get("date"), pd)
        if m < 0 or m > _num(r, "months"):
            continue
        if sv["area"] > 0 and abs(n(x.get("areaPing")) - sv["area"]) / sv["area"] * 100 > _num(
            r, "areaTolPct"
        ):
            continue
        if r.get("onlyWhole") and not is_whole(x):
            continue
        if r.get("excludeFurnished") and truthy(x.get("furnished")):
            continue
        out.append(x)
    out.sort(key=lambda x: x.get("date", ""), reverse=True)
    return out


def quantile(arr: list[float], q: float) -> float | None:
    """分位數（線性內插）；空陣列回傳 None。"""
    if not arr:
        return None
    s = sorted(arr)
    pos = (len(s) - 1) * q
    lo = math.floor(pos)
    hi = math.ceil(pos)
    return s[lo] + (s[hi] - s[lo]) * (pos - lo)


def market_stats(
    case: dict[str, Any], model: dict[str, Any], ref: ReferenceData, today: date
) -> dict[str, Any]:
    """市場行情：篩選後買賣單價的中位數、四分位數、平均，以及每月漲跌率。"""
    rows = filtered_sales(case, model, ref, today)
    pd = pd_of(case, today)
    u = [x["unitWan"] for x in rows]
    res: dict[str, Any] = {
        "rows": rows,
        "n": len(rows),
        "med": quantile(u, 0.5),
        "p25": quantile(u, 0.25),
        "p75": quantile(u, 0.75),
        "mean": sum_in_order(u) / len(u) if u else None,
        "rate": None,
    }
    months = {x.get("date") for x in rows}
    if len(rows) >= 6 and len(months) >= 3:
        xs = [[1.0, -months_between(x.get("date"), pd), n(x.get("age"))] for x in rows]
        fit = ols(xs, u)
        if fit and truthy(res["mean"]):
            res["rate"] = fit["beta"][1] / res["mean"] * 100
        res["rateFit"] = fit
    res["monthsSpan"] = len(months)
    return res


def sum_in_order(values: list[float]) -> float:
    """依序加總（對應 reduce(a + b, 0)，不做 n() 轉換）。"""
    total = 0.0
    for v in values:
        total += v
    return total


def rent_stats(
    case: dict[str, Any], model: dict[str, Any], ref: ReferenceData, today: date
) -> dict[str, Any]:
    """租金行情：篩選後每坪租金的中位數與四分位數。"""
    rows = filtered_rents(case, model, ref, today)
    u = [x["rentPerPing"] for x in rows]
    return {
        "rows": rows,
        "n": len(rows),
        "med": quantile(u, 0.5),
        "p25": quantile(u, 0.25),
        "p75": quantile(u, 0.75),
    }
