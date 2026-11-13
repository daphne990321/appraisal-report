"""估價計算：各估價方法的純函式（對應舊版 core/calc.js）與 calculate() 入口。"""

import math
from datetime import date
from typing import Any

from appraisal.domain.calc.comparison import comp_calc
from appraisal.domain.calc.cost import cost_calc
from appraisal.domain.calc.final import final_calc, special_calc
from appraisal.domain.calc.income import income_calc
from appraisal.domain.calc.land import land_calc
from appraisal.domain.calc.modelview import exp_of, inds_of, model_weights, purpose_rule
from appraisal.domain.calc.parcels import parcels_calc
from appraisal.domain.calc.reference import ReferenceData, area_of
from appraisal.domain.calc.regression import regression
from appraisal.domain.constants import is_land_kind
from appraisal.domain.jsnum import js_round, n, round_to

__all__ = ["MNAMES", "calculate"]

MNAMES = {"comparison": "比較法", "income": "收益法", "cost": "成本法", "land": "土地開發分析法"}


def _comparison(
    case: dict[str, Any],
    model: dict[str, Any],
    ref: ReferenceData,
    today: date,
    land: bool,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    """比較法；計量模型時以迴歸預測值取代。"""
    s = model["settings"]
    c = case["comp"]
    opt = {
        "volumeBasis": land and c.get("volumeBasis"),
        "subjFar": n(c.get("subjFar")) or n(case["land"].get("far")),
    }
    comp = comp_calc(
        case["comps"],
        inds_of(model, case),
        s,
        case["basic"].get("priceDate"),
        "diff" if c.get("method") == "diff" else "pct",
        c.get("inputMode"),
        exp_of(model, case),
        case.get("subjFlags") or {},
        opt,
    )
    if c.get("method") != "reg":
        return comp, None
    reg = regression(case, model, ref, today)
    ok = not reg.get("err")
    p = math.pow(10, n(s.get("unitDec")))
    comp = {
        "rows": [],
        "usedCount": reg.get("n") or 0,
        "gap": 0,
        "wSum": 100,
        "unitRaw": reg["pred"] if ok else None,
        "unit": js_round(reg["pred"] * p) / p if ok else None,
    }
    return comp, reg


def _cost(case: dict[str, Any], s: dict[str, Any]) -> dict[str, Any]:
    """成本法；有面積時以總價重算單價。"""
    b = case["basic"]
    cost = cost_calc(
        case["cost"],
        n(b.get("area")),
        n(b.get("landShare")),
        b.get("completed"),
        b.get("priceDate"),
        s,
    )
    if cost["unitRaw"] is not None and n(b.get("area")) > 0:
        cost["unitRaw"] = cost["price"] / n(b.get("area")) / 10000
        cost["unit"] = round_to(cost["unitRaw"], n(s.get("unitDec")))
    return cost


def _method_list(
    case: dict[str, Any],
    w: dict[str, Any],
    comp: dict[str, Any],
    inc: dict[str, Any],
    cost: dict[str, Any],
    land_k: dict[str, Any],
) -> list[dict[str, Any]]:
    """案件勾選的估價方法，帶試算單價與權重。"""
    units = {
        "comparison": comp["unit"],
        "income": inc["unit"],
        "cost": cost["unit"],
        "land": land_k["unit"],
    }
    return [
        {"key": m, "name": MNAMES[m], "unit": units[m], "w": n(w.get(m))}
        for m in ("comparison", "income", "cost", "land")
        if case["methods"].get(m)
    ]


def calculate(
    case: dict[str, Any], model: dict[str, Any], ref: ReferenceData, today: date
) -> dict[str, Any]:
    """依案件與估價模型算出各方法、最後價格與特定價格（對應舊版 calc()）。"""
    s = model["settings"]
    purpose = purpose_rule(case, model)
    land = is_land_kind(case.get("kind"))
    area = area_of(case)
    comp, reg = _comparison(case, model, ref, today, land)
    cost = _cost(case, s)
    inc = income_calc(
        case["income"], n(case["basic"].get("area")), cost["T"], s, purpose.get("expMult")
    )
    land_in = case["land"]
    if land and land_in.get("mode") == "detailed" and not n(land_in.get("site")) > 0:
        land_in = {**land_in, "site": area}
    land_k = land_calc(land_in, area, s)
    w = (
        model_weights(case, model, purpose)
        if case["final"].get("useModelWeights")
        else case["final"]["w"]
    )
    methods = _method_list(case, w, comp, inc, cost, land_k)
    fin = final_calc(methods, area, s)
    parcels = None
    if land or case.get("parcels"):
        parcels = parcels_calc(case.get("parcels"), fin["unit"] if land else None, s)
        if land:
            total = parcels["total"]
            fin["totalWan"] = (
                None if total is None else round_to(total / 10000, n(s.get("totalDec")))
            )
            fin["yuan"] = None if total is None else js_round(total)
    special = None
    sp = case.get("special")
    if land and sp and sp.get("enabled") and n(sp.get("far")) > 0:
        special = special_calc(case, model, land_in, area, s)
    return {
        "comp": comp, "reg": reg, "cost": cost, "inc": inc, "land": land_k, "fin": fin,
        "mc": len(methods), "P": purpose, "M": model, "W": w, "S": s, "parcels": parcels,
        "special": special, "area": area, "isLand": land,
    }  # fmt: skip
