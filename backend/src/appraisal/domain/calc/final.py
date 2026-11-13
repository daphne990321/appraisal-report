"""最後價格（finalCalc）與特定價格（舊版 core/model.js calc() 的特定價格段）。"""

import math
from typing import Any

from appraisal.domain.calc._js import js_sum
from appraisal.domain.calc.comparison import comp_calc
from appraisal.domain.calc.income import discount_factor
from appraisal.domain.calc.land import land_calc
from appraisal.domain.calc.modelview import exp_of, inds_of
from appraisal.domain.calc.parcels import parcels_calc
from appraisal.domain.jsnum import js_round, n, round_to


def final_calc(methods: list[dict[str, Any]], area: float, s: dict[str, Any]) -> dict[str, Any]:
    """各方法試算價格依權重加權成最後單價與總價（對應 finalCalc）。"""
    m = [x for x in methods if x["unit"] is not None and math.isfinite(x["unit"])]
    units = [x["unit"] for x in m]
    hi = max(units) if units else 0
    lo = min(units) if units else 0
    diff = (hi - lo) / ((hi + lo) / 2) * 100 if len(units) >= 2 else 0
    w_sum = js_sum(m, lambda x: x["w"])
    unit: float | None = None
    if len(m) == 1:
        unit = m[0]["unit"]
    elif len(m) > 1 and w_sum > 0:
        unit = round_to(js_sum(m, lambda x: x["unit"] * n(x["w"])) / w_sum, n(s.get("unitDec")))
    total_wan = None if unit is None else round_to(unit * area, n(s.get("totalDec")))
    return {
        "methods": m,
        "diff": diff,
        "wSum": w_sum,
        "unit": unit,
        "totalWan": total_wan,
        "yuan": None if total_wan is None else js_round(total_wan * 10000),
    }


def _wacc_rate(sp: dict[str, Any]) -> tuple[float, float]:
    """加權平均資金成本與折現率（輸入模式直接用輸入值，否則加各項溢酬）。"""
    own = n(sp.get("ownRatio")) / 100
    wacc = own * n(sp.get("ownRate")) + (1 - own) * n(sp.get("loanRate"))
    pr = sp.get("prem") or {}
    if sp.get("rateMode") == "input":
        rate = n(sp.get("rateInput"))
    else:
        rate = (
            wacc
            + n(pr.get("liquidity"))
            + n(pr.get("risk"))
            + n(pr.get("growth"))
            + n(pr.get("mgmt"))
        )
    return wacc, rate


def special_calc(
    case: dict[str, Any],
    model: dict[str, Any],
    land_in: dict[str, Any],
    area: float,
    s: dict[str, Any],
) -> dict[str, Any]:
    """特定價格：以特定容積率重算比較法與土地開發分析法，再折現（核心與舊版 calc() 同序）。"""
    sp = case["special"]
    comp_s = comp_calc(
        case["comps"],
        inds_of(model, case),
        s,
        case["basic"].get("priceDate"),
        "pct",
        case["comp"].get("inputMode"),
        exp_of(model, case),
        case.get("subjFlags") or {},
        {"volumeBasis": True, "subjFar": n(sp.get("far"))},
    )
    land_s = land_calc({**land_in, "far": n(sp.get("far"))}, area, s)
    ws = sp.get("w") or {}
    methods = case["methods"]
    wc = n(ws.get("comparison")) if methods.get("comparison") else 0
    wl = n(ws.get("land")) if methods.get("land") else 0
    wt = wc + wl
    done = ((comp_s["unit"] or 0) * wc + (land_s["unit"] or 0) * wl) / wt if wt > 0 else None
    wacc, rate = _wacc_rate(sp)
    df = discount_factor(rate, sp.get("years")) if n(sp.get("years")) > 0 else 1
    dec = n(s.get("unitDec"))
    unit_s = None if done is None else round_to(done * df, dec)
    p_s = parcels_calc(case.get("parcels"), unit_s, s)
    return {
        "comp": comp_s,
        "land": land_s,
        "done": None if done is None else round_to(done, dec),
        "wacc": wacc,
        "rate": rate,
        "df": df,
        "unit": unit_s,
        "parcels": p_s,
        "totalWan": None
        if p_s["total"] is None
        else round_to(p_s["total"] / 10000, n(s.get("totalDec"))),
    }
