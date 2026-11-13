"""從估價模型取出本案適用的部分（對應舊版 core/model.js 的 findModel、indsOf、expOf 等）。"""

from typing import Any

from appraisal.domain.constants import kind_of
from appraisal.domain.model.builtin import default_indicator_set

_DEFAULT_PURPOSE: dict[str, Any] = {
    "w": {"comparison": 80, "income": 20, "cost": 0, "land": 0},
    "capFloor": 0,
    "expMult": 1,
}


def find_model(models: list[dict[str, Any]], model_id: Any) -> dict[str, Any]:
    """依代號找模型；找不到用第一個。"""
    for m in models:
        if m.get("id") == model_id:
            return m
    return models[0]


def model_of(models: list[dict[str, Any]], case: dict[str, Any]) -> dict[str, Any]:
    """案件用的模型：已簽核且有快照就用快照，否則依 modelId 找。"""
    snapshot = case.get("modelSnapshot")
    if case.get("signed") and snapshot:
        return snapshot  # type: ignore[no-any-return]
    return find_model(models, case.get("modelId"))


def purpose_rule(case: dict[str, Any], model: dict[str, Any]) -> dict[str, Any]:
    """估價目的對應的規則；模型沒有設定時用預設（比較法 80、收益法 20）。"""
    rules = model.get("purpose")
    rule = rules.get(case["basic"].get("purpose")) if rules else None
    return rule if rule is not None else {**_DEFAULT_PURPOSE, "w": dict(_DEFAULT_PURPOSE["w"])}


def set_key(case: dict[str, Any] | None) -> str:
    """標的類型使用的因素組代號。"""
    return str(kind_of(case.get("kind") if case else None)["set"])


def ind_all(model: dict[str, Any], case: dict[str, Any]) -> list[dict[str, Any]]:
    """本案類型的全部調整指標（含未啟用）。"""
    k = set_key(case)
    sets = model.get("indicatorSets")
    found = sets.get(k) if sets else None
    if found is not None:
        return found  # type: ignore[no-any-return]
    return model["indicators"] if k == "bldg" else default_indicator_set(k)


def inds_of(model: dict[str, Any], case: dict[str, Any]) -> list[dict[str, Any]]:
    """本案類型已啟用的調整指標。"""
    return [x for x in ind_all(model, case) if x.get("on")]


def exp_of(model: dict[str, Any], case: dict[str, Any]) -> list[dict[str, Any]]:
    """本案類型已啟用的額外調整項目（exp）。"""
    k = set_key(case)
    out = []
    for x in model.get("exp") or []:
        sets = x.get("sets")
        if x.get("on") and (sets is None or k in sets):
            out.append(x)
    return out


def model_weights(case: dict[str, Any], model: dict[str, Any], purpose: dict[str, Any]) -> Any:
    """最後價格的方法權重：模型依標的類型有設定就用，否則用估價目的的權重。"""
    kw = (model.get("kindWeights") or {}).get(case.get("kind"))
    return kw if kw is not None else purpose["w"]
