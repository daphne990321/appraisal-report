"""敘述式報告書（第二號公報範本）的章節順序（對照舊版 core/report.js 的 build）。

序言、基本事項、因素分析在 narrative_body.py；各方法的計算過程在 sections*.py。
"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import n
from appraisal.domain.report.blocks import Block, Out
from appraisal.domain.report.env import METHOD_KEYS, Env, amount_line, make_env
from appraisal.domain.report.fmt import MDEF, MNAME, SECT, f, num, ph, roc, s, unit_txt
from appraisal.domain.report.narrative_body import analysis_part, basic_part, preface_part
from appraisal.domain.report.sections import comp_section
from appraisal.domain.report.sections_land import land_section, parcel_table, special_section
from appraisal.domain.report.sections_money import cost_section, income_section
from appraisal.domain.validate.format import ge

TOC = [
    "不動產估價報告書摘要", "壹、序言", "貳、估價基本事項", "參、價格形成之主要因素分析",
    "肆、價格評估", "伍、價格結論",
    "陸、依不動產估價技術規則須敘明之情況及其他與估價相關之必要事項",
    "柒、不動產估價師", "附件",
]  # fmt: skip


def _letter_body(e: Env) -> list[str]:
    """函的三段文字。"""
    b = e.c["basic"]
    sp = e.c.get("special") or {}
    special = bool(e.k.get("special"))
    price_date = roc(b.get("priceDate"))
    special_line = (
        " " + s(sp.get("label") or "特定條件") + "之特定價格為" + s(e.sp_amt) + "。"
        if special
        else ""
    )
    return [
        "關於 貴公司委託本所針對座落於" + s(e.title)
        + "之勘估標的進行價值評估乙案，本所業已完成估價報告書。"
        "依 貴公司委託內容，估價目的為" + ph(b.get("purpose"))
        + "，價格種類為" + s(b.get("priceType"))
        + ("及特定價格" if special else "") + "，價格日期為" + price_date
        + "，並考量 貴公司提供之勘估標的基本資料，評估勘估標的於現行不動產市場條件下之合理價值。"
        "評估過程均詳載於估價報告書，且依循不動產估價師法及不動產估價技術規則相關規定。",
        "經本所估價師採用" + e.method_names() + "進行評估，決定勘估標的於" + price_date
        + "之價值為：" + amount_line(e) + "。" + special_line,
        "以上評估結果僅適用於勘估標的於前述估價目的下之價值參考。由於不動產價值變動之特性，"
        "本估價報告書所載內容之有效期間最長為價格日期起 " + s(e.tx.get("validMonths") or 6)
        + " 個月內。",
    ]  # fmt: skip


def _cover(o: Out, e: Env) -> None:
    """封面與函。"""
    c = e.c
    b, a = c["basic"], c["appraiser"]
    sp = c.get("special") or {}
    amount = (
        "正常價格 " + e.amt + "；" + s(sp.get("label") or "特定") + "特定價格 " + s(e.sp_amt)
        if e.k.get("special")
        else e.amt
    )
    o.add({
        "t": "cover", "office": a.get("office"), "title": "不動產估價報告書",
        "rows": [
            ["案號", e.case_no], ["委託人", ph(b.get("client"), "委託人")],
            ["勘估標的", e.title], ["估價金額", amount], ["價格日期", roc(b.get("priceDate"))],
        ],
    })  # fmt: skip
    o.pb()
    o.add({
        "t": "letter", "to": ph(b.get("client"), "委託人"), "body": _letter_body(e),
        "office": a.get("office"), "signer": a.get("name"),
        "certs": [
            ["開業證書字號", ph(a.get("licenseNo"))],
            ["公會會員證書字號", ph(a.get("guildNo"))],
            ["不動產估價師證書字號", ph(a.get("certNo"))],
        ],
    })  # fmt: skip
    o.pb()


def _summary_rows(e: Env) -> list[list[str]]:
    """摘要的一至六項。"""
    c = e.c
    b = c["basic"]
    special = bool(e.k.get("special"))
    pc: Any = e.k.get("parcels")
    if e.has_parcels:
        lands = "、".join(
            (r["p"].get("section") or "") + (s(r["p"]["no"]) + " 地號" if r["p"].get("no") else "")
            for r in pc["rows"]
        )
        area = "土地 " + f(pc["m2"], 2) + " 平方公尺（" + f(pc["ping"], 4) + " 坪）"
        if not e.land:
            area += (
                "；建物 "
                + f(n(b.get("area")) * 3.30579, 2)
                + " 平方公尺（"
                + f(b.get("area"), 2)
                + " 坪）"
            )
    else:
        lands = ph(b.get("landNo"), "地號")
        area = "建物 " + f(b.get("area"), 2) + " 坪"
    conclusion = amount_line(e) + ("；特定價格 " + s(e.sp_amt) if special else "")
    return [
        ["一、案號", e.case_no], ["二、委託人", ph(b.get("client"))], ["三、勘估標的", e.title],
        ["　土地標示", lands], ["　建物標示", "—" if e.land else ph(b.get("bldgNo"), "建號")],
        ["　面積", area], ["　所有權人", ph(b.get("owner"))], ["　使用分區", ph(b.get("zone"))],
        ["　使用現況", ph(c["survey"].get("useStatus"))], ["　標的類型", s(e.kd.get("name"))],
        ["四、估價目的", ph(b.get("purpose"))],
        ["　價格種類", s(b.get("priceType")) + ("、特定價格" if special else "")],
        ["　估價條件", ph(b.get("conditions"))], ["　價格日期", roc(b.get("priceDate"))],
        ["　勘察日期", roc(b.get("surveyDate"))], ["五、他項權利", ph(b.get("encumbrance"))],
        ["六、評估價值結論", conclusion],
    ]  # fmt: skip


def _toc_and_summary(o: Out, e: Env) -> None:
    """目錄與摘要。"""
    o.h1("目錄")
    o.list(TOC, False)
    o.pb()
    o.h1("不動產估價報告書摘要")
    o.kv(_summary_rows(e))
    pc: Any = e.k.get("parcels")
    if e.has_parcels and n(pc.get("tax")) > 0:
        net = f(e.fin["yuan"] - pc["tax"], 0) if truthy(e.fin.get("yuan")) else "—"
        o.p(
            "按公告土地現值核算之土地增值稅約新臺幣 " + f(pc["tax"], 0)
            + " 元；扣除後淨值約新臺幣 " + net + " 元（不考慮減免規定，實際以稅捐機關核定為準）。"
        )  # fmt: skip
    if e.has_parcels and e.land:
        parcel_table(o, e, pc, "價格摘要表")
    o.pb()


def _methods_intro(o: Out, e: Env) -> None:
    """肆之一、二：價格種類與估價方法之選定。"""
    c, R = e.c, e.R
    b = c["basic"]
    o.h1("肆、價格評估")
    o.h2("一、價格種類")
    if b.get("priceType") == "正常價格":
        special = "特定價格指具有市場性之不動產，基於特定條件下形成之價值（§2(3)）。"
        text = (
            "正常價格指具有市場性之不動產，於有意願之買賣雙方，依專業知識、謹慎行動，不受任何脅迫，"
            "經適當市場行銷及正常交易條件形成之合理價值，並以貨幣金額表示者（§2(1)）。"
            + (special if e.k.get("special") else "")
        )
    else:
        text = "本案價格種類為" + s(b.get("priceType")) + "。"
    o.p(text)
    o.h2("二、估價方法之選定")
    o.p(
        "本案依勘估標的之類型（" + s(e.kd.get("name")) + "）、估價目的及資料可取得程度，採用"
        + e.method_names() + "評估（§14）。" + s(R.get("methodReason") or "")
    )  # fmt: skip
    for m in e.methods_used:
        o.p(MDEF[m])
    not_used = [m for m in METHOD_KEYS if not c["methods"].get(m)]
    if len(e.methods_used) == 1:
        o.p("僅採一種方法之理由：" + ph(c["methods"].get("singleReason"), "理由"))
    elif not_used and truthy(R.get("notUsedReason")):
        o.p("未採" + "、".join(MNAME[m] for m in not_used) + "之理由：" + s(R["notUsedReason"]))


def _decision(o: Out, e: Env) -> None:
    """肆之四：價格決定。"""
    fin, S = e.fin, e.S
    o.h2("四、價格決定")
    methods = fin["methods"]
    many = len(methods) > 1
    if methods:
        rows = [
            [
                m["name"], unit_txt(m["unit"], S), f(m["w"], 0) + "%" if many else "100%",
                unit_txt(num(m["unit"]) * num(m["w"]) / 100, S) if many else unit_txt(m["unit"], S),
            ]
            for m in methods
        ]  # fmt: skip
        rows.append(["決定單價", "", "", unit_txt(fin.get("unit"), S)])
        o.table(["估價方法", "試算單價", "權重", "加權後"], rows, align=["l", "r", "r", "r"])
    o.p(ph(e.c["final"].get("reason"), "價格決定理由"))
    if len(methods) >= 2:
        tail = (
            "，已就顯著差異重新檢討（§15）。"
            if ge(fin.get("diff"), S.get("diffThreshold"))
            else "，未達顯著差異。"
        )
        o.p("各方法試算價格差異為 " + f(fin.get("diff"), 1) + "%" + tail)
    if e.k.get("special"):
        special_section(o, e)


def _evaluation(o: Out, e: Env) -> None:
    """肆、價格評估。"""
    _methods_intro(o, e)
    o.h2("三、價格評估過程")
    sections = [
        ("comparison", comp_section), ("income", income_section),
        ("cost", cost_section), ("land", land_section),
    ]  # fmt: skip
    i = 0
    for key, fn in sections:
        if e.c["methods"].get(key):
            fn(o, e, SECT[i])
            i += 1
    _decision(o, e)


def _conclusion(o: Out, e: Env) -> None:
    """伍、價格結論。"""
    c = e.c
    b = c["basic"]
    o.h1("伍、價格結論")
    o.p(
        "勘估標的係坐落於" + s(e.title) + "之不動產，基於估價目的為" + ph(b.get("purpose"))
        + "，價格種類為" + s(b.get("priceType")) + "，價格日期為" + roc(b.get("priceDate"))
        + "，經本所估價師針對產權、一般因素、區域因素、個別因素、不動產市場現況及最有效使用分析後，"
        "決定勘估標的價格如下："
    )  # fmt: skip
    pc: Any = e.k.get("parcels")
    if e.has_parcels and e.land:
        parcel_table(o, e, pc, "勘估標的價格明細表（正常價格）")
    else:
        area = f(e.k.get("area") or b.get("area"), 2)
        o.table(
            ["項目", "單價", "面積(坪)", "總價"],
            [["勘估標的", unit_txt(e.fin.get("unit"), e.S), area, e.amt]],
            align=["l", "r", "r", "r"],
        )
    if e.k.get("special"):
        label = s((c.get("special") or {}).get("label") or "特定")
        title = "勘估標的價格明細表（" + label + "特定價格）"
        parcel_table(o, e, e.k["special"].get("parcels"), title)
    o.add({"t": "amount", "text": amount_line(e)})


def _closing(o: Out, e: Env) -> None:
    """陸、須敘明之情況；柒、估價師；附件。"""
    c = e.c
    a = c["appraiser"]
    notes = e.v["notes"]
    o.h1("陸、依不動產估價技術規則須敘明之情況及其他與估價相關之必要事項")
    o.h2("一、依不動產估價技術規則須敘明之情況")
    if notes:
        o.list([s(x["t"]) + "（" + s(x["law"]) + "）" for x in notes])
    else:
        o.p("無。")
    o.h2("二、其他與估價相關之必要事項")
    other = [x for x in s(c.get("other") or "").split("\n") if x]
    if other:
        o.list(other)
    else:
        o.p("無。")
    o.h1("柒、不動產估價師")
    signer = ph(a.get("name")) + (
        "（已簽章，" + s(c.get("signedAt")) + "）" if truthy(c.get("signed")) else "（簽章）"
    )
    exp = "（有效期限 " + s(a["licenseExp"]) + "）" if truthy(a.get("licenseExp")) else ""
    o.kv([
        ["事務所", s(a.get("office") or "")], ["不動產估價師", signer],
        ["不動產估價師證書字號", ph(a.get("certNo"))],
        ["開業證書字號", ph(a.get("licenseNo")) + exp],
        ["公會會員證書字號", ph(a.get("guildNo"))], ["所屬公會", s(a.get("guild") or "")],
    ])  # fmt: skip
    o.h1("附件")
    extra = "土地使用分區證明" if e.land else "建物測量成果圖"
    o.list([
        "勘估標的位置圖", "勘估標的都市計畫（使用分區）略圖", "土地及建物登記謄本",
        "地籍圖謄本", extra,
        "比較標的位置圖及實價登錄資料", "勘估標的現況照片",
        "營造或施工費標準表、物價指數及利率參考資料", "不動產估價師證照影本",
    ])  # fmt: skip


def build(
    c: dict[str, Any], k: dict[str, Any], v: dict[str, Any], ctx: dict[str, Any] | None = None
) -> list[Block]:
    """產生敘述式報告書的區塊。"""
    e = make_env(c, k, v, ctx or {})
    o = Out()
    _cover(o, e)
    _toc_and_summary(o, e)
    preface_part(o, e)
    basic_part(o, e)
    analysis_part(o, e)
    _evaluation(o, e)
    _conclusion(o, e)
    _closing(o, e)
    return o.blocks
