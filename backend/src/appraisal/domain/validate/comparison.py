"""比較法的檢核規則：附註與必須處理的問題（§19～§27）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import js_str, to_number
from appraisal.domain.validate._msg import Messages
from appraisal.domain.validate.format import cat, fmt, ge, gt, lt, num_gt0, pct


def _method_notes(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    cm = c["comp"]["method"]
    comps = c["comps"]
    if truthy(c["methods"].get("comparison")) and cm != "reg" and comps:
        grade = "，依事務所指標級距表評定等級" if c["comp"].get("inputMode") == "grade" else ""
        name = "差額法" if cm == "diff" else "百分率法"
        m.note("區域因素及個別因素調整採" + name + grade + "。", "§24", "comps")
    reg = k.get("reg")
    if (
        truthy(c["methods"].get("comparison"))
        and cm == "reg"
        and reg
        and not truthy(reg.get("err"))
    ):
        p = "< 0.0001" if lt(reg["p"], 0.0001) else fmt(reg["p"], 4)
        m.note(
            "比較法採計量模型分析法，樣本 "
            + cat(reg["n"])
            + " 筆、自變數 "
            + cat(reg["k"])
            + " 個，調整後判定係數 "
            + fmt(reg["adjR2"], 3)
            + "，整體顯著機率 "
            + p
            + "。",
            "§19(7)、§20",
            "comps",
        )


def _comp_notes(cp: dict[str, Any], r: dict[str, Any], m: Messages) -> None:
    label = cat(cp.get("label"))
    if truthy(cp.get("special")) and to_number(cp.get("cond")) != 0:
        reason = cat(cp["condReason"]) + "，" if truthy(cp.get("condReason")) else ""
        m.note(
            "比較標的 "
            + label
            + " 為「"
            + cat(cp["special"])
            + "」，"
            + reason
            + "以情況調整 "
            + pct(cp.get("cond"))
            + " 採用。",
            "§23",
            "comps",
        )
    if truthy(cp.get("verifyIssue")):
        m.note(
            "比較標的 " + label + " " + cat(cp["verifyIssue"]) + "，查證有困難。", "§22 II", "comps"
        )
    if cp.get("priceType") == "ask":
        m.note(
            "比較標的 "
            + label
            + " 為擬售價格，經訪查區域成交行情，扣除議價空間 "
            + fmt(cp.get("bargain"), 1)
            + "% 後作為預估可能成交價格。",
            "§23",
            "comps",
        )
    if (
        (truthy(r.get("viol15")) or truthy(r.get("viol30")))
        and truthy(cp.get("exception"))
        and cp.get("include") is not False
    ):
        reason = cat(cp["exceptionReason"]) if truthy(cp.get("exceptionReason")) else "[理由待填]"
        m.note(
            "比較標的 " + label + " 調整率超過上限，因" + reason + "，仍予採用。",
            "§25 但書",
            "comps",
        )


def notes(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    """比較法附註（調整法、計量模型、逐筆比較標的、容積地價）。"""
    _method_notes(c, k, m)
    comparison = truthy(c["methods"].get("comparison"))
    if comparison and c["comp"]["method"] != "reg":
        for i, cp in enumerate(c["comps"]):
            _comp_notes(cp, k["comp"]["rows"][i], m)
    if truthy(k.get("isLand")) and comparison and truthy(c["comp"].get("volumeBasis")):
        m.note(
            "土地比較標的之容積率與勘估標的不同，"
            "以每 100% 容積地價（容積地價）換算後再行比較調整。",
            "§24",
            "comps",
        )


def _reg_blocks(k: dict[str, Any], m: Messages) -> None:
    reg = k.get("reg")
    if not reg or truthy(reg.get("err")):
        why = cat(reg["err"]) if reg and truthy(reg.get("err")) else "無法估計"
        m.block("計量模型：" + why, "§20", "comp")
        return
    ok = reg["ok20"]
    if not truthy(ok.get("n")):
        need = js_str(5 * to_number(reg["k"]))
        m.block(
            "計量模型樣本 "
            + cat(reg["n"])
            + " 筆，需達自變數 "
            + cat(reg["k"])
            + " 個的 5 倍（"
            + need
            + " 筆）",
            "§20(1)",
            "comp",
        )
    if not truthy(ok.get("r2")):
        m.block("調整後判定係數 " + fmt(reg["adjR2"], 3) + "，不得低於 0.7", "§20(2)", "comp")
    if not truthy(ok.get("p")):
        m.block("整體顯著機率 " + fmt(reg["p"], 4) + "，不得大於 5%", "§20(3)", "comp")


def _row_blocks(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    s = k["S"]
    for i, cp in enumerate(c["comps"]):
        r = k["comp"]["rows"][i]
        label = cat(cp.get("label"))
        include = cp.get("include") is not False
        if truthy(cp.get("special")) and to_number(cp.get("cond")) == 0 and include:
            m.block(
                "比較標的 " + label + " 屬特殊交易，須先做情況調整，無法量化則不得採用",
                "§23",
                "comp",
            )
        v15, v30 = truthy(r.get("viol15")), truthy(r.get("viol30"))
        if (v15 or v30) and not truthy(cp.get("exception")) and include:
            what = (
                " 單項或小計超過 " + cat(s["lim15"]) + "%"
                if v15
                else " 總調整率超過 " + cat(s["lim30"]) + "%"
            )
            m.block("比較標的 " + label + what + "，已自動排除", "§25", "comp")


def blocks(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    """比較法的必須處理項目（最少件數、特殊交易、調整率上限、價格差距、權重）。"""
    if not truthy(c["methods"].get("comparison")):
        return
    if c["comp"]["method"] == "reg":
        _reg_blocks(k, m)
        return
    s, comp = k["S"], k["comp"]
    if lt(comp["usedCount"], s["minComps"]):
        m.block(
            "可採用的比較標的 "
            + cat(comp["usedCount"])
            + " 件，需 "
            + cat(s["minComps"])
            + " 件以上",
            "§27",
            "comp",
        )
    _row_blocks(c, k, m)
    if ge(comp["gap"], s["gapLim"]):
        m.block(
            "試算價格差距 " + fmt(comp["gap"], 2) + "%，達 " + cat(s["gapLim"]) + "% 以上",
            "§26",
            "comp",
        )
    if truthy(comp["usedCount"]) and gt(abs(to_number(comp["wSum"]) - 100), 0.05):
        m.block("比較標的權重合計 " + fmt(comp["wSum"], 1) + "%，應為 100%", "§27", "comp")


def volume_blocks(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    """土地容積地價比較需要的容積率。"""
    if not (truthy(k.get("isLand")) and truthy(c["methods"].get("comparison"))):
        return
    if not truthy(c["comp"].get("volumeBasis")):
        return
    if not num_gt0(c["comp"].get("subjFar")):
        m.block("容積地價比較須輸入勘估標的允建容積率", "§24", "comp")
    for cp in c["comps"]:
        if not num_gt0(cp.get("far")):
            m.block(
                "比較標的 " + cat(cp.get("label")) + " 缺容積率，無法換算容積地價", "§24", "comp"
            )
