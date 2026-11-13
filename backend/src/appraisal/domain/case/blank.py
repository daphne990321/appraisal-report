"""空白案件（對照舊版 core/model.js 的 blankCase，預設值只有這一份）。"""

import copy
from typing import Any

from appraisal.domain.constants import BTYPES, is_land_kind, kind_of


def _parcels(kind_id: str) -> list[dict[str, Any]]:
    if not (is_land_kind(kind_id) or kind_id in ("hotel", "house")):
        return []
    return [
        {
            "section": "", "no": "", "zone": "", "areaM2": 0, "share": 1, "annVal": 0,
            "prevVal": 0, "prevDate": "", "cpi": 100, "priceMode": "base", "adjPct": 0,
            "annPct": 30, "unit": 0, "note": "",
        }
    ]  # fmt: skip


def _special() -> dict[str, Any]:
    return {
        "enabled": False, "label": "都市更新完成後", "far": 0, "years": 0, "rateMode": "wacc",
        "ownRatio": 50, "ownRate": 1.7, "loanRate": 3.27,
        "prem": {"liquidity": 0.9, "risk": 0.9, "growth": 0.9, "mgmt": 1.2},
        "rateInput": 5, "w": {"comparison": 50, "land": 50},
    }  # fmt: skip


def _report() -> dict[str, Any]:
    return {
        "caseNo": "", "docNo": "", "leader": "",
        "surveyRefs": "登記謄本、地籍圖、都市計畫圖、現場照片",
        "surveyConclusion": "", "dataSources": "", "otherBurden": "無", "market": "",
        "marketSupply": "", "marketDemand": "", "marketPrice": "", "regionChecks": {},
        "methodReason": "", "notUsed": {},
    }  # fmt: skip


def _basic(from_basic: dict[str, Any]) -> dict[str, Any]:
    return {
        "county": from_basic.get("county") or "新竹縣",
        "district": from_basic.get("district") or "竹北市",
        "road": "", "addr": "", "bldgNo": "", "landNo": "", "zone": "", "btype": BTYPES[0],
        "area": 0, "landShare": 0, "floorNum": 0, "totalFloors": 0, "completed": "",
        "floorDesc": "", "owner": "", "encumbrance": "", "purpose": "買賣參考", "priceDate": "",
        "surveyDate": "", "priceType": "正常價格", "conditions": "", "normalPrice": "",
        "client": "", "fee": "", "contractDate": "", "scope": "",
    }  # fmt: skip


def _survey_analysis() -> dict[str, Any]:
    keys = (
        "traffic",
        "life",
        "school",
        "nuisance",
        "floor",
        "view",
        "light",
        "layout",
        "cond",
        "mgmt",
    )
    return {
        "survey": {
            "led": True, "indoor": True, "photos": 0, "useStatus": "", "illegal": "none",
            "notes": "", "d": dict.fromkeys(keys, ""),
        },
        "analysis": {"general": "", "region": "", "indiv": "", "hbu": "", "confirmed": False},
    }  # fmt: skip


_INDUSTRIAL_ONLY_REASON = (
    "勘估標的為工業區土地，區域內交易以購地自建廠房為主，租賃案例少且租金受建物型態與產業別影響甚鉅，"
    "難以規劃標準化產品，收益法與土地開發分析法均不適用，故僅以比較法評估。"
)


def _income(kind_id: str, model: dict[str, Any], k: dict[str, Any]) -> dict[str, Any]:
    hotel = kind_id == "hotel"
    names = ("地價稅", "房屋稅", "保險費", "維修費", "重置提撥費")
    return {
        "method": "dcf" if hotel else "direct", "revMode": "hotel" if hotel else "rent",
        "rooms": 0, "adr": 0, "occ": 70, "otherPct": 5, "opexPct": 60 if hotel else 0,
        "mgmtPct": 1 if hotel else 0, "rent": 0, "rentSource": "",
        "vacMonths": model["income"]["vacMonths"], "incomes": [],
        "exp": [{"name": nm, "amt": 0} for nm in names],
        "costSource": "cost", "manualCost": 0, "life": k["life"], "salvage": k["salvage"],
        "threeYears": True, "capMode": "input", "cap": model["income"]["cap"],
        "risk": {"base": 1.6, "liquidity": 0.2, "risk": 0.3, "growth": -0.6, "mgmt": 0.1},
        "extract": [],
        "wacc": [{"name": "自有資金", "w": 40, "k": 2}, {"name": "借貸資金", "w": 60, "k": 2.5}],
        "dcr": {"dcr": 1.2, "rate": 2.5, "years": 30, "ltv": 70},
        "egim": {"nir": 70, "egim": 55},
        "dcf": {
            "years": 10, "rentGrowth": 1, "rentGrowth2": 1, "switchYear": 0, "expGrowth": 1,
            "disc": 2.5, "termCap": 2, "sellCost": 1, "deductDep": False,
        },
    }  # fmt: skip


def _cost(k: dict[str, Any]) -> dict[str, Any]:
    return {
        "conMethod": "unit", "unitCost": k["unitCost"], "indexPct": 100, "extraLand": 0,
        "unitCostNote": "", "items": [], "design": k["design"], "extras": [], "adSell": k["adSell"],
        "mgmt": k["mgmt"], "tax": k["tax"], "interest": k["interest"], "profit": k["profit"],
        "depMethod": "straight", "sinkRate": 2, "life": k["life"], "salvage": k["salvage"],
        "ageManual": False, "age": 0, "landUnit": 0,
    }  # fmt: skip


def _land(kind_id: str, k: dict[str, Any], ld: dict[str, Any]) -> dict[str, Any]:
    """舊版用 `LD.x || 預設`：模型值為 0 或空時也改用預設，這裡照做。"""

    def pick(key: str, default: float) -> Any:
        return ld.get(key) or default

    return {
        "mode": "detailed" if is_land_kind(kind_id) else "simple",
        "sales": [{"name": "住宅", "ping": 0, "unit": 0}], "floorArea": 0,
        "conUnit": k["unitCost"], "conIndex": 100, "design": pick("design", 2),
        "adSell": pick("adSell", 6), "mgmt": pick("mgmt", 4.5), "tax": pick("tax", 1),
        "profit": pick("profit", 20), "iMode": "table", "annualRate": 2.5, "landRatio": 60,
        "years": 3, "iInput": 5, "site": 0, "far": 0, "bonus": 0,
        "freeFactor": pick("freeFactor", 1.3), "floorsAbove": 12, "floorsBelow": 2, "digRate": 60,
        "saleFactor": pick("saleFactor", 1.75), "firstFloorRatio": pick("firstFloorRatio", 0.88),
        "baseUnit": 0, "baseFloor": pick("baseFloor", 4), "util1F": pick("util1F", 200),
        "utilStep": pick("utilStep", 1), "utils": {}, "cars": 0,
        "pingPerCar": pick("pingPerCar", 18), "carPrice": 150,
        "ownRatio": pick("ownRatio", 50), "ownRate": pick("ownRate", 1.7),
        "loanRate": pick("loanRate", 3.27), "buildMonths": 28, "landMonths": 34,
    }  # fmt: skip


def blank_case(
    case_id: str,
    model: dict[str, Any],
    from_case: dict[str, Any] | None = None,
    kind: str | None = "unit",
) -> dict[str, Any]:
    """依標的類型與估價模型建立空白案件；from_case 只沿用縣市與行政區。"""
    k = model["cost"]
    kd = kind_of(kind or "unit")
    from_basic = (from_case or {}).get("basic") or {}
    mw = (model.get("kindWeights") or {}).get(kd["id"]) or model["purpose"]["買賣參考"]["w"]
    methods = dict(kd["methods"])
    methods["singleReason"] = _INDUSTRIAL_ONLY_REASON if kd["id"] == "industrial" else ""
    return {
        "id": case_id, "kind": kd["id"], "signed": False, "signedAt": "", "modelId": model["id"],
        "modelSnapshot": None, "subjFlags": {}, "parcels": _parcels(kd["id"]), "buildings": [],
        "special": _special(), "report": _report(), "basic": _basic(from_basic),
        **_survey_analysis(),
        "methods": methods,
        "comp": {
            "method": "pct", "inputMode": "grade", "regVars": ["age", "floor", "area", "months"],
            "volumeBasis": is_land_kind(kd["id"]), "subjFar": 0,
        },
        "comps": [], "income": _income(kd["id"], model, k), "cost": _cost(k),
        "land": _land(kd["id"], k, model.get("lda") or {}),
        "final": {"useModelWeights": True, "w": copy.deepcopy(mw), "reviewed": False, "reason": ""},
        "other": "",
        "appraiser": {
            "name": "林○○", "certNo": "", "licenseNo": "", "licenseExp": "",
            "office": "○○不動產估價師事務所", "guild": "[縣市]不動產估價師公會",
        },
    }  # fmt: skip
