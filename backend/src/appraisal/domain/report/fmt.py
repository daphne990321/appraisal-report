"""報告用的格式工具（對照舊版 core/report.js 開頭的 n、f、pc、sg、V、roc、unitTxt、amtTxt）。

數字格式沿用 jsnum.py 與 validate/format.py，不另寫一份。
"""

import math
import re
from typing import Any, Final

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import js_round, js_str, to_fixed, to_number
from appraisal.domain.validate.format import cat, fmt, num_or0, pct

SECT: Final[tuple[str, ...]] = (
    "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
    "十一", "十二", "十三", "十四", "十五",
)  # fmt: skip
MNAME: Final[dict[str, str]] = {
    "comparison": "比較法",
    "income": "收益法",
    "cost": "成本法",
    "land": "土地開發分析法",
}
MDEF: Final[dict[str, str]] = {
    "comparison": (
        "比較法係以比較標的價格為基礎，經比較、分析及調整等，以推算勘估標的價格之方法（§18）。"
    ),
    "income": (
        "收益法係以勘估標的未來平均一年期間之客觀淨收益，應用價格日期當時適當之收益資本化率"
        "推算勘估標的價格之方法；得採直接資本化法及折現現金流量分析法（§28）。"
    ),
    "cost": (
        "成本法係求取勘估標的於價格日期之重建成本或重置成本，扣減其累積折舊額或其他應扣除部分，"
        "以推算勘估標的價格之方法（§48）。"
    ),
    "land": (
        "土地開發分析法係根據土地法定用途及使用強度進行開發與改良所導致土地效益之變化，"
        "估算開發或建築後總銷售金額，扣除開發期間之直接成本、間接成本、資本利息及利潤後，"
        "求得開發前或建築前土地價格之方法（§70）。"
    ),
}

DASH: Final = "—"
_PH_RE = re.compile(r"(⟦[^⟧]*⟧)")

# 對照 JS：Number(x)、字串相加（cat）與 Number(x)||0（num_or0）
num = to_number
s = cat


def f(v: Any, d: Any = None) -> str:
    """對應 f(v, d)：千分位、固定 d 位小數；空值與非數字得「—」。"""
    digits = num_or0(d)
    return fmt(v, int(digits) if math.isfinite(digits) else 0)


def pc(v: Any, d: int | None = None) -> str:
    """對應 pc(v, d)：帶正負號的百分比（負號為 U+2212），d 預設 1 位。"""
    return pct(v, d)


def sg(v: Any, d: int | None = None) -> str:
    """對應 sg(v, d)：帶正負號的數字，d 預設 2 位。"""
    x = num_or0(v)
    sign = "+" if x > 0 else "−" if x < 0 else ""
    return sign + to_fixed(abs(x), 2 if d is None else d)


def ph(x: Any, label: str | None = None) -> str:
    """對應 V(x, p)：有值就轉成字串，沒有就標成待填 ⟦…⟧。"""
    return cat(x) if truthy(x) else "⟦" + (label or "待填") + "⟧"


def roc(d: Any) -> str:
    """對應 roc(d)：YYYY-MM-DD 轉民國年；空值為 ⟦日期⟧，格式不符原樣回傳。"""
    if not truthy(d):
        return "⟦日期⟧"
    parts = cat(d).split("-")
    if len(parts) < 2:
        return cat(d)
    out = "民國 " + js_str(num(parts[0]) - 1911) + " 年 " + parts[1] + " 月"
    return out + (" " + parts[2] + " 日" if len(parts) > 2 and parts[2] else "")


def unit_txt(v: Any, S: dict[str, Any]) -> str:
    """對應 unitTxt：單價；顯示單位為元時換算成元/坪。"""
    if v is None:
        return DASH
    if S.get("unitDisplay") == "yuan":
        return f(js_round(num(v) * 10000), 0) + " 元/坪"
    return f(v, S.get("unitDec")) + " 萬元/坪"


def amt_txt(total_wan: Any, yuan: Any, S: dict[str, Any]) -> str:
    """對應 amtTxt：總價；有顯示為元時用元，否則用萬元。"""
    if total_wan is None:
        return "⟦尚未決定⟧"
    if yuan is not None and S.get("unitDisplay") == "yuan":
        return "新臺幣 " + f(yuan, 0) + " 元"
    return "新臺幣 " + f(total_wan, S.get("totalDec")) + " 萬元"


def num_txt(x: Any) -> str:
    """對應 toLocaleString('zh-TW', {maximumFractionDigits: 4})：最多 4 位小數，去掉尾端 0。"""
    text = fmt(x, 4)
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text


def split_placeholders(text: str) -> list[tuple[str, bool]]:
    """把字串切成 [(文字, 是否待填)]；待填片段已去掉 ⟦ ⟧ 符號，空片段略過。"""
    out: list[tuple[str, bool]] = []
    for part in _PH_RE.split(text):
        if part == "":
            continue
        is_ph = part.startswith("⟦")
        out.append((part[1:-1] if is_ph else part, is_ph))
    return out
