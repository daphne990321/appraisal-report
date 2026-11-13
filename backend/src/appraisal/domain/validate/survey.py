"""現場勘察的附註（§13、§103）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.validate._msg import Messages


def access_notes(c: dict[str, Any], m: Messages) -> None:
    """未領勘、未進入室內。"""
    sv = c["survey"]
    if not truthy(sv.get("led")):
        m.note("委託人未領勘，勘估標的範圍依登記資料及現場判斷認定。", "§13 II", "survey")
    if not truthy(sv.get("indoor")):
        m.note("未能進入室內勘察，室內狀況依委託人陳述及外觀推估。", "§13 II", "survey")


def illegal_notes(c: dict[str, Any], m: Messages) -> None:
    """違章建築的處理方式。"""
    illegal = c["survey"].get("illegal")
    if illegal == "exclude":
        m.note("勘估標的附有違章建築，違建部分不予評估。", "§103", "survey")
    if illegal == "separate":
        m.note("依委託人要求，違建部分另行評估並分別標示價格。", "§103", "survey")
