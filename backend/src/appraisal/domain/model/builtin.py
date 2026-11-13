"""內建估價模型（對照舊版 core/data.js 的 defaultModel 與 default*）。"""

import copy
from typing import Any

from appraisal.domain.constants import FACTOR_SETS, PURPOSES
from appraisal.domain.model.builtin_data import DEFAULT_EXP, DEFAULT_KIND_WEIGHTS, DEFAULT_TEXTS


def default_indicator_set(key: str) -> list[dict[str, Any]]:
    """某一組因素的預設調整指標；第四個值為 0 的細項預設不啟用。"""
    f = FACTOR_SETS[key]

    def make(group: str, x: tuple[Any, ...]) -> dict[str, Any]:
        return {
            "id": x[0],
            "group": group,
            "cat": x[1],
            "name": x[2],
            "step": 1,
            "stepAmt": 0.5,
            "on": not (len(x) > 3 and x[3] == 0),
        }

    return [make("region", x) for x in f["region"]] + [make("indiv", x) for x in f["indiv"]]


def default_indicators() -> list[dict[str, Any]]:
    return default_indicator_set("bldg")


def default_indicator_sets() -> dict[str, list[dict[str, Any]]]:
    return {k: default_indicator_set(k) for k in ("bldg", "land", "ind")}


def default_exp() -> list[dict[str, Any]]:
    return copy.deepcopy(DEFAULT_EXP)


def default_purpose(conservative: bool = False) -> dict[str, dict[str, Any]]:
    """各估價目的的方法權重、資本化率下限與費用倍數。"""

    def rule(c: int, i: int, floor: float = 0, mult: float = 1) -> dict[str, Any]:
        return {
            "w": {"comparison": c, "income": i, "cost": 0, "land": 0},
            "capFloor": floor,
            "expMult": mult,
        }

    o = {p: rule(80, 20) for p in PURPOSES}
    o["抵押權設定"] = rule(70, 30, 1.6, 1.2)
    o["法院訴訟"] = rule(70, 30)
    o["都市更新權利變換"] = {
        "w": {"comparison": 60, "income": 0, "cost": 0, "land": 40},
        "capFloor": 0,
        "expMult": 1,
    }
    o["企業資產評價"] = rule(50, 50)
    if conservative:
        for p in PURPOSES:
            o[p]["capFloor"] = max(o[p]["capFloor"], 1.6)
            o[p]["expMult"] = max(o[p]["expMult"], 1.2)
            if p in ("買賣參考", "繼承、贈與"):
                o[p]["w"] = {"comparison": 70, "income": 30, "cost": 0, "land": 0}
    return o


def default_kind_weights() -> dict[str, Any]:
    return copy.deepcopy(DEFAULT_KIND_WEIGHTS)


def default_texts() -> dict[str, Any]:
    return copy.deepcopy(DEFAULT_TEXTS)


def _cost_defaults() -> dict[str, Any]:
    rows = [
        ("加強磚造 1–3 層", 7.6),
        ("鋼筋混凝土造 4–5 層", 9.8),
        ("鋼筋混凝土造 6–10 層", 11.2),
        ("鋼筋混凝土造 11–15 層", 12.6),
        ("鋼骨鋼筋混凝土造 16–25 層", 15.8),
        ("鋼骨造 26 層以上", 19.5),
    ]
    return {
        "unitCost": 11.2, "design": 2.5, "adSell": 4, "mgmt": 2, "tax": 1, "interest": 2,
        "profit": 10, "life": 50, "salvage": 0,
        "table": [{"name": name, "unit": unit} for name, unit in rows],
    }  # fmt: skip


def default_model(
    model_id: str = "m1", name: str = "本所標準模型", conservative: bool = False
) -> dict[str, Any]:
    """內建估價模型；conservative 為 True 時是抵押貸款用的保守版本。"""
    sets = default_indicator_sets()
    return {
        "id": model_id,
        "name": name,
        "updated": "2026-10-24",
        "note": (
            "供抵押權設定等需保守估計之案件：選取期間較短、資本化率設下限、費用取高值。"
            if conservative
            else "本所一般案件使用。"
        ),
        "settings": {
            "dateMode": "auto", "monthlyRate": 0 if conservative else 0.3, "weightMode": "manual",
            "totalMode": "abs", "lim15": 15, "lim30": 30, "gapLim": 20, "minComps": 3,
            "diffThreshold": 20, "unitDec": 1, "totalDec": 0, "unitDisplay": "wan",
        },
        "indicators": sets["bldg"],
        "indicatorSets": sets,
        "exp": default_exp(),
        "select": {
            "sameCounty": True, "sameDistrict": True, "sameType": True, "sameZone": True,
            "months": 12 if conservative else 24, "ageTol": 5 if conservative else 10,
            "areaTolPct": 30 if conservative else 40, "floorTol": 10, "excludeSpecial": True,
            "excludePresale": True, "keyword": "", "autoN": 3, "wDate": 30, "wAge": 25,
            "wArea": 20, "wFloor": 15, "wRoad": 10,
        },
        "rentSelect": {
            "sameCounty": True, "sameDistrict": True, "sameType": False, "months": 12,
            "areaTolPct": 60, "onlyWhole": True, "excludeFurnished": False,
        },
        "purpose": default_purpose(conservative),
        "kindWeights": default_kind_weights(),
        "income": {"vacMonths": 1.5 if conservative else 1, "cap": 1.8 if conservative else 1.25},
        "sources": {"lvr": True, "own": True},
        "lda": {
            "profit": 20, "design": 2, "adSell": 6, "mgmt": 4.5, "tax": 1, "ownRatio": 50,
            "ownRate": 1.7, "loanRate": 3.27, "freeFactor": 1.3, "saleFactor": 1.75,
            "firstFloorRatio": 0.88, "util1F": 200, "utilStep": 1, "baseFloor": 4, "pingPerCar": 18,
        },
        "texts": default_texts(),
        "cost": _cost_defaults(),
    }  # fmt: skip
