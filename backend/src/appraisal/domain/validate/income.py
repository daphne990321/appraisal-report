"""收益法的檢核規則（§31～§43）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import to_number
from appraisal.domain.validate._msg import Messages
from appraisal.domain.validate.format import cat, fmt, gt, lt, num_gt0


def note(c: dict[str, Any], m: Messages) -> None:
    """未蒐集三年收支資料的附註。"""
    if truthy(c["methods"].get("income")) and not truthy(c["income"].get("threeYears")):
        m.note("收益法未能蒐集最近三年間收支資料。", "§35 II", "income")


def _cap_blocks(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    inc, cap = c["income"], k["inc"].get("cap")
    if inc["method"] != "direct":
        return
    floor = k["P"].get("capFloor")
    if not gt(cap, 0):
        m.block("收益資本化率須大於 0", "§43", "income")
    if gt(floor, 0) and gt(cap, 0) and lt(cap, floor):
        b = c["basic"]
        m.block(
            "收益資本化率 "
            + fmt(cap, 2)
            + "% 低於估價模型「"
            + cat(k["M"]["name"])
            + "」對「"
            + cat(b.get("purpose"))
            + "」設定的下限 "
            + fmt(floor, 2)
            + "%",
            "本所模型",
            "income",
        )


def _dcf_wacc_blocks(c: dict[str, Any], m: Messages) -> None:
    inc = c["income"]
    if inc["method"] == "dcf" and not (
        num_gt0(inc["dcf"].get("disc")) and num_gt0(inc["dcf"].get("termCap"))
    ):
        m.block("DCF 須輸入折現率與期末資本化率", "§31、§32", "income")
    if inc["method"] == "direct" and inc.get("capMode") == "wacc":
        total = 0.0
        for x in inc["wacc"]:
            total += to_number(x.get("w") if truthy(x.get("w")) else 0)
        if abs(total - 100) > 0.05:
            m.block("加權平均資金成本法的資金比例合計應為 100%", "§43(3)", "income")


def blocks(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    """收益法必須處理項目（資本化率、DCF、資金比例、月租金）。"""
    if not truthy(c["methods"].get("income")):
        return
    _cap_blocks(c, k, m)
    _dcf_wacc_blocks(c, m)
    inc = c["income"]
    if inc.get("revMode") != "hotel" and not num_gt0(inc.get("rent")):
        m.block(
            "收益法須輸入月租金（可在「資料匯入 › 實價登錄：租賃」套用租金行情）", "§36", "income"
        )


def hotel_block(c: dict[str, Any], m: Messages) -> None:
    """旅館收益須輸入客房數與平均房價。"""
    inc = c["income"]
    hotel = truthy(c["methods"].get("income")) and inc.get("revMode") == "hotel"
    if hotel and not (num_gt0(inc.get("rooms")) and num_gt0(inc.get("adr"))):
        m.block("旅館收益須輸入客房數與平均房價", "§36", "income")
