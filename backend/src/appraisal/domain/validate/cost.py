"""成本法的檢核規則（§57～§69）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import to_number
from appraisal.domain.validate._msg import Messages
from appraisal.domain.validate.format import cat, fmt, gt, lt


def notes(c: dict[str, Any], m: Messages) -> None:
    """成本法附註（人工調整屋齡、土地以比較法求取）。"""
    if not truthy(c["methods"].get("cost")):
        return
    cost = c["cost"]
    if truthy(cost.get("ageManual")):
        m.note(
            "建物已經歷年數依實際構成部分與使用狀態調整為 " + fmt(cost.get("age")) + " 年。",
            "§68 II",
            "cost",
        )
    m.note(
        "土地價格以比較法求取（每坪 " + fmt(cost.get("landUnit"), 1) + " 萬元）。", "§69 II", "cost"
    )


def warns(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    """規劃設計費率、殘餘價格率、折舊說明的提醒。"""
    cost, income, methods = c["cost"], c["income"], c["methods"]
    uses_cost = truthy(methods.get("cost")) or (
        truthy(methods.get("income")) and income.get("costSource") == "cost"
    )
    design = cost.get("design", float("nan"))
    if uses_cost and (lt(design, 2) or gt(design, 3)):
        m.warn("規劃設計費率 " + cat(design) + "% 不在 2%～3% 之間", "§57", "cost")
    if (
        to_number(cost.get("salvage", float("nan"))) > 10
        or to_number(income.get("salvage", float("nan"))) > 10
    ):
        m.warn("殘餘價格率超過 10%", "§67", "cost")
    if truthy(k["cost"].get("depNote")) and truthy(methods.get("cost")):
        m.warn(cat(k["cost"]["depNote"]), "§68", "cost")
