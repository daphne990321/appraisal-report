"""多筆土地逐筆計價與土地增值稅試算。"""

from typing import Any

from appraisal.domain.calc._js import js_sum, missing_or_empty
from appraisal.domain.jsnum import js_round, n, round_to


def land_vat(p: dict[str, Any]) -> dict[str, float]:
    """公告土地現值計算之土地增值稅（一般稅率，不考慮長期持有減徵與自用住宅優惠）。"""
    share = 1 if missing_or_empty(p, "share") else n(p["share"])
    a = n(p.get("areaM2")) * share
    cur = n(p.get("annVal")) * a
    prev = n(p.get("prevVal")) * (n(p.get("cpi")) or 100) / 100 * a
    inc = cur - prev
    if not (inc > 0) or not (prev > 0):
        return {"cur": cur, "prev": prev, "inc": max(0, inc), "tax": 0}
    ratio = inc / prev
    if ratio < 1:
        tax = inc * 0.2
    elif ratio < 2:
        tax = inc * 0.3 - prev * 0.1
    else:
        tax = inc * 0.4 - prev * 0.3
    return {"cur": cur, "prev": prev, "inc": inc, "ratio": ratio, "tax": js_round(tax)}


def _share(p: dict[str, Any]) -> float:
    return 1 if missing_or_empty(p, "share") else n(p["share"])


def _parcel_unit(p: dict[str, Any], base_unit: Any, s: dict[str, Any]) -> float | None:
    """單筆土地單價：公告現值比例、手動單價，或基地單價加調整率。"""
    mode = p.get("priceMode")
    if mode == "announced":
        unit: float | None = n(p.get("annVal")) * 3.30579 * n(p.get("annPct") or 100) / 100 / 10000
    elif mode == "manual":
        unit = n(p.get("unit"))
    elif base_unit is None:
        unit = None
    else:
        unit = n(base_unit) * (1 + n(p.get("adjPct")) / 100)
    if unit is not None and (mode == "base" or not mode):
        unit = round_to(unit, max(n(s.get("unitDec")), 2))
    return unit


def parcels_calc(parcels: Any, base_unit: Any, s: dict[str, Any]) -> dict[str, Any]:
    """多筆土地逐筆計價（對應 parcelsCalc）；base_unit 為基地單價（萬元／坪）或 None。"""
    rows: list[dict[str, Any]] = []
    for p in parcels or []:
        ping = n(p.get("areaM2")) * _share(p) / 3.30579
        unit = _parcel_unit(p, base_unit, s)
        total = None if unit is None else unit * ping * 10000
        rows.append({"p": p, "ping": ping, "unit": unit, "total": total, "vat": land_vat(p)})
    total_all = (
        None if any(r["total"] is None for r in rows) else js_sum(rows, lambda r: r["total"])
    )
    return {
        "rows": rows,
        "ping": js_sum(rows, lambda r: r["ping"]),
        "m2": js_sum(rows, lambda r: n(r["p"].get("areaM2")) * _share(r["p"])),
        "total": total_all,
        "tax": js_sum(rows, lambda r: r["vat"]["tax"]),
    }
