"""不動產估價報告書應載明事項 15 項的完成檢查（§16 II）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.validate._msg import Messages
from appraisal.domain.validate.format import num_gt0

ITEMS15 = [
    "委託人",
    "勘估標的之基本資料",
    "價格日期及勘察日期",
    "價格種類",
    "估價條件",
    "估價目的",
    "估價金額",
    "所有權、他項權利及其他負擔",
    "勘估標的使用現況",
    "法定使用管制或其他管制事項",
    "價格形成之主要因素分析",
    "估價方法、估算過程及價格決定理由",
    "依本規則規定須敘明之情況",
    "其他與估價相關之必要事項",
    "估價師姓名及證照字號",
]
_DS = "data:subject"
_ITEM_TAB = [
    _DS,
    _DS,
    _DS,
    _DS,
    _DS,
    _DS,
    "final",
    _DS,
    "survey",
    _DS,
    "survey",
    "final",
    "final",
    "final",
    _DS,
]


def _basic_ok(c: dict[str, Any], k: dict[str, Any]) -> bool:
    b = c["basic"]
    if truthy(k.get("isLand")):
        parcels: Any = k.get("parcels")
        if not truthy(parcels) or not parcels["rows"]:
            return False
        return all(
            truthy(r["p"].get("no")) and num_gt0(r["p"].get("areaM2")) for r in parcels["rows"]
        )
    return truthy(b.get("addr")) and truthy(b.get("bldgNo")) and num_gt0(b.get("area"))


def item_flags(c: dict[str, Any], k: dict[str, Any]) -> list[bool]:
    """15 項各自是否完成。"""
    b, a, fin = c["basic"], c["appraiser"], k["fin"]
    return [
        truthy(b.get("client")),
        _basic_ok(c, k),
        truthy(b.get("priceDate")) and truthy(b.get("surveyDate")),
        truthy(b.get("priceType")),
        truthy(b.get("conditions")),
        truthy(b.get("purpose")),
        fin.get("totalWan", 0) is not None,
        truthy(b.get("owner")) and truthy(b.get("encumbrance")),
        truthy(c["survey"].get("useStatus")),
        truthy(b.get("zone")),
        truthy(c["analysis"].get("confirmed")),
        truthy(c["final"].get("reason")) and fin.get("unit", 0) is not None,
        True,
        True,
        truthy(a.get("name")) and truthy(a.get("certNo")) and truthy(a.get("licenseNo")),
    ]


def blocks(c: dict[str, Any], k: dict[str, Any], m: Messages) -> list[bool]:
    """未完成的項目加入 bl，回傳 15 項旗標。"""
    items = item_flags(c, k)
    for i, ok in enumerate(items):
        if not ok:
            m.block(
                "報告書第 " + str(i + 1) + " 項「" + ITEMS15[i] + "」未完成", "§16 II", _ITEM_TAB[i]
            )
    return items
