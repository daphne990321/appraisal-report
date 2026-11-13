"""成本法：營造費、利潤利息、折舊（不動產估價技術規則第 3 章第 2 節）。"""

from typing import Any

from appraisal.domain.calc._js import js_div, js_pow, js_sum, missing_or_empty, truthy
from appraisal.domain.dates import years_between
from appraisal.domain.jsnum import n, round_to


def _depreciation(k: dict[str, Any], total: float, age: float) -> tuple[float, str]:
    """折舊額與說明（等速、定率、償債基金）；回傳 (dep, depNote)。"""
    life = n(k.get("life"))
    s = n(k.get("salvage")) / 100
    t = min(age, life)
    if life <= 0:
        return 0.0, ""
    method = k.get("depMethod")
    if method == "declining":
        if s > 0:
            d = 1 - js_pow(s, 1 / life)
            return total * (1 - js_pow(1 - d, t)), ""
        return total * (1 - s) * t / life, "定率法須殘餘價格率大於 0，暫以等速計算"
    if method == "sinking":
        i = n(k.get("sinkRate")) / 100
        if i > 0:
            return js_div(total * (1 - s) * (js_pow(1 + i, t) - 1), js_pow(1 + i, life) - 1), ""
        return total * (1 - s) * t / life, ""
    return total * (1 - s) * t / life, ""


def cost_calc(
    k: dict[str, Any],
    area: float,
    land_share: float,
    completed: Any,
    price_date: Any,
    s: dict[str, Any],
) -> dict[str, Any]:
    """成本法主計算（對應 costCalc）。"""
    idx = (100 if missing_or_empty(k, "indexPct") else n(k["indexPct"])) / 100
    if k.get("conMethod") == "items":
        construction = js_sum(k["items"], lambda x: n(x.get("qty")) * n(x.get("price")))
    else:
        construction = n(k.get("unitCost")) * idx * 10000 * area
    design = construction * n(k.get("design")) / 100
    extras = js_sum(k["extras"], lambda x: x.get("amt"))
    extras_dep = js_sum(k["extras"], lambda x: n(x.get("amt")) * n(x.get("depPct")) / 100)
    x_sum = construction + design + extras
    g = (1 + n(k.get("interest")) / 100) * (1 + n(k.get("profit")) / 100)
    f = (n(k.get("adSell")) + n(k.get("mgmt")) + n(k.get("tax"))) / 100
    t = x_sum * g / (1 - f * g) if (1 - f * g) > 0 else 0.0
    fees = t * f
    interest = (x_sum + fees) * n(k.get("interest")) / 100
    profit = (x_sum + fees + interest) * n(k.get("profit")) / 100
    age = n(k.get("age")) if truthy(k.get("ageManual")) else years_between(completed, price_date)
    dep, dep_note = _depreciation(k, t, age)
    extra_land = n(k.get("extraLand"))
    building = t - dep - extras_dep
    land = n(k.get("landUnit")) * 10000 * land_share + extra_land
    price = land + building
    unit_raw = price / area / 10000 if area > 0 else None
    return {
        "idx": idx, "extrasDep": extras_dep, "extraLand": extra_land, "construction": construction,
        "design": design, "extras": extras, "fees": fees, "interest": interest, "profit": profit,
        "T": t, "age": age, "dep": dep, "depNote": dep_note, "building": building, "land": land,
        "price": price, "unitRaw": unit_raw,
        "unit": None if unit_raw is None else round_to(unit_raw, n(s.get("unitDec"))),
    }  # fmt: skip
