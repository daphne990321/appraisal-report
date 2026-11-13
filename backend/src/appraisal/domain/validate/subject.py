"""勘估標的（地號、特定價格）與估價模型的檢核規則。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.validate._msg import Messages
from appraisal.domain.validate.format import cat, fmt, gt, num_or0, pct

_DS = "data:subject"


def parcel_notes(k: dict[str, Any], m: Messages) -> None:
    """地號計價方式的附註（公告現值、個別因素調整超過 15%）。"""
    parcels: Any = k.get("parcels")
    for r in parcels["rows"] if truthy(parcels) else []:
        p = r["p"]
        head = cat(p["section"]) if truthy(p.get("section")) else ""
        name = head + cat(p.get("no"))
        mode = p.get("priceMode")
        if mode == "announced":
            zone = cat(p["zone"]) if truthy(p.get("zone")) else ""
            why = cat(p["note"]) if truthy(p.get("note")) else "市場性低、難以比較標的及開發推估"
            m.note(
                name
                + " 地號（"
                + zone
                + "）因"
                + why
                + "，以價格日期當期公告土地現值 "
                + fmt(p.get("annPct"), 0)
                + "% 核計。",
                "§16 II(13)",
                "subject",
            )
        if mode not in ("announced", "manual") and abs(num_or0(p.get("adjPct"))) > 15:
            extra = "（" + cat(p["note"]) + "）" if truthy(p.get("note")) else ""
            m.note(
                name
                + " 地號與基地條件差異較大，以基地單價調整 "
                + pct(p.get("adjPct"))
                + "，個別因素調整超過 15%"
                + extra
                + "。",
                "§25 但書",
                "subject",
            )


def specific_price_note(c: dict[str, Any], m: Messages) -> None:
    """特定價格的估價條件與正常價格附註。"""
    b = c["basic"]
    if b.get("priceType") != "特定價格":
        return
    cond = cat(b["conditions"]) if truthy(b.get("conditions")) else "[待填]"
    normal = fmt(b["normalPrice"]) + " 萬元" if truthy(b.get("normalPrice")) else "[待填]"
    m.note(
        "本案以特定價格估價，估價條件：" + cond + "；同時估計之正常價格為新臺幣 " + normal + "。",
        "§6 II",
        "subject",
    )


def land_area_block(k: dict[str, Any], m: Messages) -> None:
    """土地案件至少要有一筆地號與面積。"""
    if not truthy(k.get("isLand")):
        return
    if gt(k.get("area"), 0):
        return
    parcels: Any = k.get("parcels")
    if truthy(parcels) and any(gt(r.get("ping"), 0) for r in parcels["rows"]):
        return
    m.block("請在「勘估標的」輸入至少一筆土地的地號與面積", "§7、§11", _DS)


def specific_price_block(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    """特定價格須同時估計正常價格。"""
    b = c["basic"]
    if (
        b.get("priceType") == "特定價格"
        and not truthy(b.get("normalPrice"))
        and not truthy(k.get("special"))
    ):
        m.block("特定價格須同時估計正常價格", "§6 II", _DS)


def model_deleted_warn(
    c: dict[str, Any], k: dict[str, Any], models: list[dict[str, Any]] | None, m: Messages
) -> None:
    """案件原用的估價模型已不存在（計算時改用第一個模型）；沒有提供模型清單時不檢查。"""
    model_id = c.get("modelId")
    if models is None or not truthy(model_id) or truthy(c.get("signed")):
        return
    if not any(x.get("id") == model_id for x in models):
        m.warn(
            "本案原本使用的估價模型已刪除，暫以「" + cat(k["M"]["name"]) + "」計算",
            "本所模型",
            "subject",
        )
