"""摘要式報告的現勘答案讀取、格式選擇與揭露文字（對照舊版 core/survey.js）。

題庫本身在 survey_data.py；這裡只放讀答案與判斷的函式。
"""

from typing import Any, Final, Literal

from appraisal.domain.calc._js import truthy
from appraisal.domain.constants import is_land_kind
from appraisal.domain.report.survey_data import AREA_ROWS, LIEN_COLS, SURVEY

__all__ = [
    "AREA_ROWS",
    "LIEN_COLS",
    "RESIDENTIAL_KINDS",
    "SURVEY",
    "chk_get",
    "chk_of",
    "chk_shown",
    "report_format",
    "survey_disclosures",
    "survey_groups",
]

RESIDENTIAL_KINDS: Final[tuple[str, ...]] = ("unit", "house")


def chk_of(case: dict[str, Any]) -> dict[str, Any]:
    """寫入用：取得案件的 chk，沒有就建立（會改到案件內容）。"""
    chk = case.get("chk")
    if not isinstance(chk, dict):
        chk = {}
        case["chk"] = chk
    return chk


def chk_get(case: dict[str, Any]) -> dict[str, Any]:
    """讀取用：沒有 chk 時回傳空字典，不改案件內容。"""
    chk = case.get("chk")
    return chk if isinstance(chk, dict) else {}


def chk_shown(case: dict[str, Any], item: dict[str, Any]) -> bool:
    """這題在目前的答案下是否顯示（show 條件）。"""
    show = item.get("show")
    if not show:
        return True
    v = chk_get(case).get(show["k"])
    if "not" in show:
        excluded = show["not"]
        if isinstance(v, list):
            return len(v) > 0 and any(x not in excluded for x in v)
        return truthy(v) and v not in excluded
    want = show["v"] if isinstance(show["v"], list) else [show["v"]]
    if isinstance(v, list):
        return any(x in want for x in v)
    return v in want


def survey_groups(case: dict[str, Any], step: str) -> list[dict[str, Any]]:
    """某一步要填的題組；土地案件只留 land 為真的題組。"""
    land = is_land_kind(case.get("kind"))
    return [g for g in SURVEY if g["step"] == step and (not land or g.get("land"))]


def report_format(case: dict[str, Any]) -> Literal["narrative", "summary"]:
    """報告格式：使用者指定優先；auto 時，抵押權設定的住宅（未勾高價宅）用摘要式。"""
    fmt = (case.get("report") or {}).get("format") or "auto"
    if fmt == "summary":
        return "summary"
    if fmt == "narrative":
        return "narrative"
    summary = (
        case["basic"].get("purpose") == "抵押權設定"
        and case.get("kind") in RESIDENTIAL_KINDS
        and not truthy(chk_get(case).get("luxury"))
    )
    return "summary" if summary else "narrative"


def survey_disclosures(case: dict[str, Any]) -> list[str]:
    """揭露文字（注意須知四）：兩種報告共用。"""
    x = chk_get(case)
    out: list[str] = []
    if x.get("entered") == "未能入內":
        suffix = "，內部照片係由委託人提供" if truthy(x.get("photoByClient")) else ""
        out.append("本次因故未能進入勘估標的內部勘察" + suffix + "。")
    return out
