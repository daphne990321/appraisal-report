"""摘要式報告書（第十四號公報範本）的區塊（對照舊版 core/report.js 的 buildSummary）。

數字只取自計算結果與案件資料；唯一的運算是面積換算、公設比、加總、單位換算與淨值。
沒有資料一律顯示待填。各方法的試算表在 summary_tables.py。
"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import n
from appraisal.domain.report.blocks import Block, Out
from appraisal.domain.report.env import Env, make_env
from appraisal.domain.report.fmt import f, num_txt, ph, roc, s, unit_txt
from appraisal.domain.report.summary_head import TBD, fin_txt, front, land_nos, liens_of
from appraisal.domain.report.summary_tables import comp_table, cost_table, income_table
from appraisal.domain.report.survey import (
    SURVEY,
    chk_get,
    chk_shown,
    survey_disclosures,
)


def item_txt(X: dict[str, Any], it: dict[str, Any]) -> str:
    """一題勾選題 → 「■選中 □未選」文字。"""
    val, t = X.get(it["k"]), it["type"]
    if t in ("one", "many"):
        sel = [] if val is None or val == "" else (val if isinstance(val, list) else [val])
        opts = [*it["opts"], *(["其他"] if it.get("other") else [])]
        text = "　".join(("■" if o in sel else "□") + o for o in opts)
        if it.get("other") and "其他" in sel:
            text += "　其他：" + ph(X.get(it["k"] + "_x"), "說明")
        return text
    unit = " " + it["unit"] if it.get("unit") else ""
    if t == "num":
        return TBD + unit if val is None or val == "" else num_txt(val) + unit
    if t == "yn":
        return "■是　□否" if val is True else "□是　■否" if val is False else "□是　□否"
    return ph(val, "待填")


def group_rows(e: Env, gid: str) -> list[list[str]] | None:
    """某題組目前要顯示的 [題目, 答案] 列；土地案件略過非土地題組，沒有列回傳 None。"""
    g = next((x for x in SURVEY if x["id"] == gid), None)
    if g is None or (e.land and not g.get("land")):
        return None
    X = chk_get(e.c)
    rows = [[it["label"], item_txt(X, it)] for it in g["items"] if chk_shown(e.c, it)]
    return rows or None


def group_kv(o: Out, e: Env, gid: str, extra: list[list[str]] | None = None) -> None:
    """題組輸出成 kv 區塊；沒有任何列就略過。"""
    rows = group_rows(e, gid)
    if rows is None and not extra:
        return
    o.kv([*(extra or []), *(rows or [])])


def lien_line(lien: dict[str, Any]) -> str:
    """一筆他項權利的一行說明。"""
    amount = (
        "擔保債權總金額 " + f(lien["amount"], 0) + " 元"
        if n(lien.get("amount"))
        else s(lien.get("amount") or "")
    )
    parts = [
        s(lien.get("kind") or ""),
        "權利人 " + s(lien["holder"]) if lien.get("holder") else "",
        amount,
    ]
    return "，".join(x for x in parts if x)


def _value_list(e: Env) -> list[str]:
    """評估內容七：各方法價格與最終金額。"""
    c, k, S = e.c, e.k, e.S
    use = c["methods"]
    vl = ["比較價格：未採用"]
    if use.get("comparison") and k.get("comp"):
        vl = ["比較價格：建坪單價 " + unit_txt(k["comp"].get("unit"), S)]
    ic, ct = k.get("inc"), k.get("cost")
    if use.get("income") and ic:
        vl.append(
            "收益價格：新台幣 " + f(ic.get("price"), 0) + " 元（建坪單價 "
            + unit_txt(ic.get("unit"), S) + "）"
        )  # fmt: skip
    else:
        vl.append("收益價格：未採用")
    if use.get("cost") and ct:
        vl.append(
            "成本價格：新台幣 " + f(ct.get("price"), 0) + " 元（建坪單價 "
            + unit_txt(ct.get("unit"), S) + "）"
        )  # fmt: skip
    vl.append("最終決定之估價金額：" + fin_txt(e))
    return vl


def _lien_txt(e: Env, X: dict[str, Any]) -> str:
    """評估內容八：他項權利設定狀況。"""
    b = e.c["basic"]
    liens = liens_of(X)
    if truthy(X.get("noLien")):
        return "■無設定　□有設定"
    if liens:
        return "□無設定　■有設定：" + "；".join(lien_line(x) for x in liens)
    note = "（" + s(b["encumbrance"]) + "）" if b.get("encumbrance") else ""
    return "□無設定　□有設定" + note


def _basic_info(o: Out, e: Env, X: dict[str, Any]) -> None:
    """評估內容一至八。"""
    c, k = e.c, e.k
    b = c["basic"]
    pc: Any = k.get("parcels")
    o.h1("評估內容")
    o.h2("一、委託人")
    o.p(ph(b.get("client"), "委託人"))
    o.h2("二、勘估標的之基本資料")
    land_txt = (
        land_nos(e) + "；面積 " + f(pc["m2"], 2) + " 平方公尺（" + f(pc["ping"], 2) + " 坪）"
        if e.has_parcels
        else ph(b.get("landNo"), "地號")
    )
    bldg_txt = "—" if e.land else (
        ph(b.get("bldgNo"), "建號") + "；建物面積 " + f(b.get("area"), 2) + " 坪（"
        + f(n(b.get("area")) * 3.30579, 2) + " 平方公尺）"
    )  # fmt: skip
    o.kv([
        ["1.土地標示", land_txt], ["2.建物標示", bldg_txt],
        ["3.建物門牌", "—" if e.land else ph(b.get("addr"), "門牌")],
    ])  # fmt: skip
    o.h2("三、價格日期及勘察日期")
    o.kv([["價格日期", roc(b.get("priceDate"))], ["勘察日期", roc(b.get("surveyDate"))]])
    o.h2("四、價格種類")
    o.p(s(b.get("priceType")) + ("及特定價格" if k.get("special") else ""))
    o.h2("五、估價條件")
    o.p(ph(b.get("conditions"), "估價條件"))
    o.h2("六、估價目的")
    o.p(ph(b.get("purpose"), "估價目的"))
    o.h2("七、估價金額")
    o.list(_value_list(e))
    o.h2("八、勘估標的之所有權、他項權利及其他負擔")
    lien_txt = _lien_txt(e, X)
    o.kv([*(group_rows(e, "title") or []), ["他項權利及其他負擔", lien_txt]])


def _factors(o: Out, e: Env) -> None:
    """評估內容九至十一。"""
    b = e.c["basic"]
    o.h2("九、勘估標的使用現況")
    for gid in ("use", "ext", "defect"):
        group_kv(o, e, gid)
    o.h2("十、勘估標的法定使用管制或其他管制事項")
    group_kv(o, e, "law", [["使用分區", ph(b.get("zone"), "使用分區")]])
    o.h2("十一、價格形成之主要因素分析")
    count = 0

    def sub(gid: str, title: str) -> int:
        rows = group_rows(e, gid)
        if rows is None:
            return count
        o.h3(str(count + 1) + "." + title)
        o.kv(rows)
        return count + 1

    count = sub("area", "區域條件分析及區域建物使用")
    count = sub("market", "市場面分析")
    if not e.land:
        count += 1
        o.h3(str(count) + ".標的結構及規劃")
        o.kv(
            [["標的結構", ph(b.get("floorDesc"), "結構")], ["標的規劃", ph(b.get("btype"), "規劃")]]
        )
    for gid, title in (
        ("nuis", "外在嫌惡設施及負面因素評估"), ("site", "宗地條件"), ("bldg", "建物個別條件"),
        ("inner", "建物內部條件評估"), ("reflect", "負面因素是否已反映於估值"),
    ):  # fmt: skip
        count = sub(gid, title)


def _methods_part(o: Out, e: Env) -> None:
    """評估內容十二：採用方法與試算表。"""
    c, k, S = e.c, e.k, e.S
    m = c["methods"]
    o.h2("十二、估價所運用之方法與其估算過程及價格決定之理由")
    o.h3("（一）採用方法")
    boxes = "　".join(
        ("■" if m.get(key) else "□") + name
        for key, name in (("comparison", "比較法"), ("income", "收益法"), ("cost", "成本法"))
    )
    o.p(
        "本次價格評估考量產品特性及市場資訊，採用"
        + boxes
        + ("　■土地開發分析法" if m.get("land") else "")
        + "。"
    )
    o.h3("（二）估價方法試算表")
    if m.get("comparison"):
        comp_table(o, e)
    if m.get("income"):
        income_table(o, e)
    if m.get("cost"):
        cost_table(o, e)
    if m.get("land") and k.get("land"):
        o.p(
            "土地開發分析法價格："
            + unit_txt(k["land"].get("unit"), S)
            + "（詳細試算見敘述式報告）。"
        )
    o.h3("（三）價格決定說明")
    o.p(ph(c["final"].get("reason"), "價格決定理由"))


def _closing(o: Out, e: Env) -> None:
    """評估內容十三至十五。"""
    c = e.c
    a = c["appraiser"]
    notes = [
        s(x["t"]) + "（" + s(x["law"]) + "）" for x in (e.v.get("notes") if e.v else None) or []
    ]
    o.h2("十三、依不動產估價技術規則規定須敘明之情況")
    items = notes + survey_disclosures(c)
    if items:
        o.list(items)
    else:
        o.p("無。")
    o.h2("十四、其他與估價相關之必要事項")
    other = [x for x in s(c.get("other") or "").split("\n") if x]
    if other:
        o.list(other)
    else:
        o.p("無。")
    o.h2("十五、不動產估價師姓名及其證照字號")
    signer = ph(a.get("name")) + (
        "（已簽章，" + s(c.get("signedAt")) + "）" if truthy(c.get("signed")) else "（簽名或蓋章）"
    )
    o.kv([
        ["（一）不動產估價師", signer], ["不動產估價師證書字號", ph(a.get("certNo"))],
        ["不動產估價師開業證書字號", ph(a.get("licenseNo"))],
        ["（二）不動產估價助理員", "（簽名或蓋章）"], ["登錄字號", TBD],
    ])  # fmt: skip


def build_summary(
    c: dict[str, Any],
    k: dict[str, Any],
    v: dict[str, Any] | None,
    ctx: dict[str, Any] | None = None,
) -> list[Block]:
    """產生摘要式報告書的區塊。"""
    e = make_env(c, k, v or {}, ctx or {})
    X = chk_get(c)
    o = Out()
    front(o, e, X)
    _basic_info(o, e, X)
    _factors(o, e)
    _methods_part(o, e)
    _closing(o, e)
    return o.blocks
