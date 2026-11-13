"""土地開發分析法：資本利息綜合利率、各樓層效用比、簡式與詳式試算（技術規則第 79 條以下）。"""

import math
from typing import Any

from appraisal.domain.calc._js import js_div, js_sum
from appraisal.domain.jsnum import js_round, n, round_to


def capital_interest(land: dict[str, Any], land_amt: float, bld_amt: float) -> dict[str, float]:
    """資本利息綜合利率：建築投資計一半工期、土地投資計全期，再依投資額加權。"""
    own = n(land.get("ownRatio")) / 100
    rate = own * n(land.get("ownRate")) / 100 + (1 - own) * n(land.get("loanRate")) / 100
    b_rate = rate * n(land.get("buildMonths")) / 12 / 2
    l_rate = rate * n(land.get("landMonths")) / 12
    total = land_amt + bld_amt
    wl = land_amt / total if total > 0 else 0.5
    return {
        "rate": rate, "bRate": b_rate, "lRate": l_rate, "wLand": wl, "wBld": 1 - wl,
        "i": wl * l_rate + (1 - wl) * b_rate,
    }  # fmt: skip


def floor_util(land: dict[str, Any], f: int) -> float:
    """第 f 層的效用比；未指定時 1 樓用 util1F，其餘由基準樓層逐層遞增。"""
    utils = land.get("utils") or {}
    key = str(f)
    if key in utils and utils[key] != "":
        return n(utils[key])
    if f == 1:
        return n(land.get("util1F") or 200)
    return 100 + (f - (n(land.get("baseFloor")) or 4)) * (n(land.get("utilStep")) or 1)


def _interest_rate(
    land: dict[str, Any], v: float, c: float
) -> tuple[float, dict[str, float] | None]:
    """資本利息綜合利率 i（input、formula、table 三種）；table 時一併回傳試算表。"""
    mode = land.get("iMode")
    if mode == "input":
        return n(land.get("iInput")) / 100, None
    if mode == "formula":
        lr = n(land.get("landRatio")) / 100
        return n(land.get("annualRate")) / 100 * (lr + (1 - lr) * 0.5) * n(land.get("years")), None
    ci = capital_interest(land, max(v, 0), c)
    return ci["i"], ci


def _floor_rows(
    land: dict[str, Any], typ: float, r1: float, floors_above: int
) -> tuple[list[dict[str, Any]], float]:
    """各樓層可售面積、單價與總價；回傳 (逐層資料, 銷售總額)。"""
    floors: list[dict[str, Any]] = []
    total = 0.0
    for f in range(floors_above, 0, -1):
        ar = typ * r1 if f == 1 else typ
        u = floor_util(land, f)
        unit = n(land.get("baseUnit")) * u / 100
        amt = ar * unit * 10000
        total += amt
        floors.append({"f": f, "area": ar, "util": u, "unit": unit, "amt": amt})
    return floors, total


def lda_detailed(land: dict[str, Any], site: float, s: dict[str, Any]) -> dict[str, Any]:
    """土地開發分析法（詳式）：逐層效用比算銷售總額，疊代求土地價格。"""
    far = n(land.get("far")) / 100
    bonus = n(land.get("bonus")) / 100
    above_n = int(max(1, js_round(n(land.get("floorsAbove")))))
    below_n = max(0, js_round(n(land.get("floorsBelow"))))
    far_floor = site * far * (1 + bonus)
    above = far_floor * (n(land.get("freeFactor")) or 1)
    below = site * n(land.get("digRate")) / 100 * below_n
    total = above + below
    saleable = far_floor * (n(land.get("saleFactor")) or 1)
    r1 = n(land.get("firstFloorRatio")) or 1
    typ = js_div(saleable, (above_n - 1) + r1)
    floors, s_sum = _floor_rows(land, typ, r1, above_n)
    if n(land.get("cars")) > 0:
        cars: float = js_round(n(land.get("cars")))
    elif n(land.get("pingPerCar")) > 0:
        cars = float(math.floor(below / n(land.get("pingPerCar"))))
    else:
        cars = 0.0
    car_amt = cars * n(land.get("carPrice")) * 10000
    s_sum += car_amt
    c = total * n(land.get("conUnit")) * (n(land.get("conIndex")) or 100) / 100 * 10000
    design = c * n(land.get("design")) / 100
    sale_fees = s_sum * (n(land.get("adSell")) + n(land.get("mgmt")) + n(land.get("tax"))) / 100
    m = design + sale_fees
    r = n(land.get("profit")) / 100
    v = s_sum * 0.3
    ci = None
    i = 0.0
    for _ in range(12):
        i, ci = _interest_rate(land, v, c)
        v2 = js_div(js_div(s_sum, 1 + r), 1 + i) - (c + m)
        if abs(v2 - v) < 1:
            v = v2
            break
        v = v2
    return {
        "detailed": True, "farFloor": far_floor, "above": above, "below": below, "total": total,
        "saleable": saleable, "floors": floors, "cars": cars, "carAmt": car_amt, "S": s_sum, "C": c,
        "design": design, "saleFees": sale_fees, "M": m, "i": i, "ci": ci, "R": r, "V": v,
    }  # fmt: skip


def land_calc(land: dict[str, Any], area: float, s: dict[str, Any]) -> dict[str, Any]:
    """土地開發分析法主計算（對應 landCalc）；mode 為 detailed 用詳式，否則簡式。"""
    dec = n(s.get("unitDec"))
    if land.get("mode") == "detailed":
        d = lda_detailed(land, n(land.get("site")) or area, s)
        u = d["V"] / area / 10000 if area > 0 else None
        d["unitRaw"] = u
        d["unit"] = None if u is None else round_to(u, dec)
        return d
    s_sum = js_sum(land["sales"], lambda x: n(x.get("ping")) * n(x.get("unit")) * 10000)
    c = n(land.get("floorArea")) * n(land.get("conUnit")) * 10000
    design = c * n(land.get("design")) / 100
    sale_fees = s_sum * (n(land.get("adSell")) + n(land.get("mgmt")) + n(land.get("tax"))) / 100
    m = design + sale_fees
    lr = n(land.get("landRatio")) / 100
    if land.get("iMode") == "input":
        i = n(land.get("iInput")) / 100
    else:
        i = n(land.get("annualRate")) / 100 * (lr + (1 - lr) * 0.5) * n(land.get("years"))
    r = n(land.get("profit")) / 100
    v = js_div(js_div(s_sum, 1 + r), 1 + i) - (c + m)
    unit_raw = v / area / 10000 if area > 0 else None
    return {
        "S": s_sum, "C": c, "design": design, "saleFees": sale_fees, "M": m, "i": i, "R": r, "V": v,
        "unitRaw": unit_raw, "unit": None if unit_raw is None else round_to(unit_raw, dec),
    }  # fmt: skip
