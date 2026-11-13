"""最後價格的檢核規則：方法數、差異檢討、權重（§14、§15）與特定價格評估附註（§6 II）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import to_number
from appraisal.domain.validate._msg import Messages
from appraisal.domain.validate.format import cat, fmt, ge


def special_note(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    """特定價格：完成時價格再折現的說明。"""
    sp: Any = k.get("special")
    if not truthy(sp):
        return
    cs = c["special"]
    label = cat(cs["label"]) if truthy(cs.get("label")) else "特定條件"
    m.note(
        "特定價格以「"
        + label
        + "」允建容積率 "
        + fmt(cs.get("far"), 1)
        + "% 評估完成時價格，再以折現率 "
        + fmt(sp["rate"], 2)
        + "% 折現 "
        + fmt(cs.get("years"), 1)
        + " 年（折現比例 "
        + fmt(to_number(sp["df"]) * 100, 2)
        + "%）。",
        "§6 II",
        "final",
    )


def method_notes(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    """只採一種方法的理由，與多種方法差異過大的說明。"""
    mc = k["mc"]
    if mc == 1:
        reason = (
            cat(c["methods"]["singleReason"])
            if truthy(c["methods"].get("singleReason"))
            else "[理由待填]"
        )
        m.note("本案僅採一種估價方法：" + reason, "§14", "final")
    if mc >= 2 and ge(k["fin"]["diff"], k["S"]["diffThreshold"]):
        m.note(
            "各方法估算價格差異 " + fmt(k["fin"]["diff"], 1) + "%，已重新檢討並說明決定理由。",
            "§15",
            "final",
        )


def count_blocks(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    """至少要選一種方法；只採一種須填理由。"""
    if k["mc"] == 0:
        m.block("至少要選一種估價方法", "§14", "final")
    if k["mc"] == 1 and not truthy(c["methods"].get("singleReason")):
        m.block("只採一種方法，須填寫情況特殊之理由", "§14", "final")


def diff_weight_blocks(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    """方法差異須檢討並勾選；方法權重合計須為 100%。"""
    if k["mc"] < 2:
        return
    fin = k["fin"]
    if ge(fin["diff"], k["S"]["diffThreshold"]) and not truthy(c["final"].get("reviewed")):
        m.block("各方法差異 " + fmt(fin["diff"], 1) + "%，須重新檢討並勾選", "§15", "final")
    if abs(to_number(fin["wSum"]) - 100) > 0.05:
        extra = ""
        if truthy(c["final"].get("useModelWeights")):
            purpose = cat(c["basic"].get("purpose"))
            extra = "（模型對「" + purpose + "」的權重含未採用的方法，請勾選該方法或改手動權重）"
        m.block("方法權重合計 " + fmt(fin["wSum"], 1) + "%，應為 100%" + extra, "§15", "final")
