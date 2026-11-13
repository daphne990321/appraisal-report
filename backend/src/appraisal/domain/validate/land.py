"""土地開發分析法的檢核規則（§74～§79）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.validate._msg import Messages
from appraisal.domain.validate.format import fmt, gt


def note(c: dict[str, Any], m: Messages) -> None:
    """資本利息綜合利率直接決定的附註。"""
    if truthy(c["methods"].get("land")) and c["land"].get("iMode") == "input":
        m.note(
            "資本利息綜合利率依勘估標的資本利息負擔情形直接決定為 "
            + fmt(c["land"].get("iInput"), 2)
            + "%。",
            "§79 II",
            "land",
        )


def block(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    """須有可銷售面積與單價。"""
    if truthy(c["methods"].get("land")) and not gt(k["land"].get("S"), 0):
        m.block("土地開發分析法須輸入可銷售面積與單價", "§74、§75", "land")
