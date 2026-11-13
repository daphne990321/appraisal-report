"""比較法的計量模型分析法（對應舊版 core/model.js 的 rowVar、regression）。

ols 與 p 值的底層函式放在 ols.py，這裡重新匯出，方便依設計文件的名稱取用。
"""

from datetime import date
from typing import Any

from appraisal.domain.calc.ols import betacf, betai, gammln, invert, ols
from appraisal.domain.calc.reference import ReferenceData, filtered_sales, pd_of, subj
from appraisal.domain.dates import months_between
from appraisal.domain.jsnum import n

__all__ = ["betacf", "betai", "gammln", "invert", "ols", "regression", "row_var"]


def row_var(x: dict[str, Any], key: str, pd: Any) -> float:
    """一筆實價登錄在某個自變數的值。"""
    if key == "age":
        return n(x.get("age"))
    if key == "floor":
        return n(x.get("floorNum"))
    if key == "area":
        return n(x.get("areaPing"))
    if key == "months":
        return months_between(x.get("date"), pd)
    if key == "totalFloors":
        return n(x.get("totalFloors"))
    return 0.0


def regression(
    case: dict[str, Any], model: dict[str, Any], ref: ReferenceData, today: date
) -> dict[str, Any]:
    """以篩選後的實價登錄做 OLS，推估勘估標的單價；失敗時回傳含 err 的結果。"""
    variables = case["comp"]["regVars"]
    rows = filtered_sales(case, model, ref, today)
    pd = pd_of(case, today)
    if not variables:
        return {"err": "請至少選一個自變數"}
    if len(rows) <= len(variables) + 1:
        return {"err": "樣本數不足", "n": len(rows)}
    x = [[1.0] + [row_var(r, v, pd) for v in variables] for r in rows]
    y = [r["unitWan"] for r in rows]
    fit = ols(x, y)
    if not fit:
        return {
            "err": "無法估計（變數可能共線或沒有變異，請減少變數或放寬選取條件）",
            "n": len(rows),
        }
    s = subj(case, today)
    sv = {
        "age": s["age"],
        "floor": s["floor"],
        "area": s["area"],
        "months": 0,
        "totalFloors": s["totalFloors"],
    }
    extra = 0.0  # 舊版 reduce 的起始值是 0，最後才加截距，加總順序要相同
    for i, v in enumerate(variables):
        extra += fit["beta"][i + 1] * sv.get(v, float("nan"))
    pred = fit["beta"][0] + extra
    fit["vars"] = variables
    fit["pred"] = pred
    fit["sv"] = sv
    fit["ok20"] = {
        "n": len(rows) >= 5 * len(variables),
        "r2": fit["adjR2"] >= 0.7,
        "p": fit["p"] <= 0.05,
    }
    return fit
