"""比較標的選取條件的報告文字（對應舊版 selText，§12、§21）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.validate.format import cat


def sel_text(model: dict[str, Any]) -> str:
    """依模型的選取條件與資料來源產生一句說明。"""
    r = model["select"]
    p: list[str] = []
    for key, text in (
        ("sameCounty", "同縣市"),
        ("sameDistrict", "同鄉鎮市區"),
        ("sameType", "同建物型態"),
        ("sameZone", "同使用分區類別"),
    ):
        if truthy(r.get(key)):
            p.append(text)
    p.append("交易日期在價格日期前 " + cat(r.get("months")) + " 個月內")
    p.append("屋齡差距 " + cat(r.get("ageTol")) + " 年以內")
    p.append("面積差距 " + cat(r.get("areaTolPct")) + "% 以內")
    p.append("樓層差距 " + cat(r.get("floorTol")) + " 層以內")
    if truthy(r.get("excludeSpecial")):
        p.append("排除備註屬特殊交易者")
    if truthy(r.get("excludePresale")):
        p.append("排除預售屋交易")
    if truthy(r.get("keyword")):
        p.append("地址含「" + cat(r["keyword"]) + "」")
    src = []
    if truthy(model["sources"].get("lvr")):
        src.append("內政部實價登錄")
    if truthy(model["sources"].get("own")):
        src.append("本所估價案例")
    where = "及".join(src) or "[資料來源]"
    return (
        "比較標的依本所估價模型「"
        + cat(model["name"])
        + "」之選取條件，自"
        + where
        + "中篩選："
        + "、".join(p)
        + "（§12、§21）。"
    )
