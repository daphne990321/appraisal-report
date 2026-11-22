"""敘述式報告書的壹（序言）、貳（估價基本事項）、參（價格形成之主要因素分析）。"""

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import n
from appraisal.domain.report.blocks import Out
from appraisal.domain.report.env import Env
from appraisal.domain.report.fmt import f, ph, roc, s, unit_txt

DATA_SOURCES = [
    "不動產權利狀態以地政事務所核發之登記謄本為準。",
    "都市計畫及土地使用分區以都市計畫機關查詢或土地使用分區證明為準。",
    "不動產個別條件及區域環境係估價人員親赴現場勘察，並依都市計畫及地籍資料查證紀錄。",
    "價格資料取自內政部不動產交易實價查詢服務網、本所案例資料庫，並向仲介、地政士、估價同業訪查。",
]


def preface_part(o: Out, e: Env) -> None:
    """壹、序言。"""
    tx = e.tx
    o.h1("壹、序言")
    o.h2("一、估價立場聲明")
    o.list(tx.get("stance") or [])
    o.h2("二、估價報告書基本聲明事項")
    o.list(tx.get("assumptions") or [])
    o.h2("三、估價報告書使用之限制條件")
    o.list(tx.get("limits") or [])


def _parcel_rows(e: Env) -> list[list[str]]:
    """貳之二「勘估標的內容」的地號表列。"""
    pc = e.k["parcels"]
    rows: list[list[str]] = []
    for r in pc["rows"]:
        p = r["p"]
        whole = "share" not in p or p["share"] == "" or n(p["share"]) == 1
        rows.append([
            p.get("section") or "", p.get("no") or "⟦地號⟧", p.get("zone") or "",
            f(p.get("areaM2"), 2), "全部" if whole else s(p["share"]), f(r["ping"], 4),
        ])  # fmt: skip
    rows.append(["合計", "", "", f(pc["m2"], 2), "", f(pc["ping"], 4)])
    return rows


def _building_kv(o: Out, e: Env) -> None:
    """貳之二（一）的建物資料表。"""
    b = e.c["basic"]
    total = b.get("totalFloors") or "—"
    floor = (
        "第 " + s(b.get("floorNum")) + " 層／共 " + s(total) + " 層"
        if n(b.get("floorNum"))
        else "共 " + s(total) + " 層"
    )
    o.kv([
        ["門牌", ph(b.get("addr"))],
        ["建號", ph(b.get("bldgNo"))],
        ["建物面積", f(b.get("area"), 2) + " 坪（" + f(n(b.get("area")) * 3.30579, 2)
            + " 平方公尺）"],
        ["樓層", floor],
        ["構造", ph(b.get("floorDesc"))],
        ["建築完成日", ph(b.get("completed"))],
        ["建物型態", s(b.get("btype"))],
    ])  # fmt: skip


def _survey_kv(o: Out, e: Env) -> None:
    """貳之七「現況勘察情況說明」。"""
    c, R = e.c, e.R
    b, sv = c["basic"], c["survey"]
    led = (
        s(R.get("leader") or "委託人指派人員領勘") + "。"
        if truthy(sv.get("led"))
        else "委託人未領勘，由本所人員自行前往勘察，位置依地籍圖、都市計畫圖及現場比對，"
        "正確界址以地政機關鑑界為準。"
    )
    photos = "（拍攝現況照片 " + s(sv["photos"]) + " 張）" if truthy(sv.get("photos")) else ""
    o.kv([
        ["勘察日期", roc(b.get("surveyDate"))],
        ["領勘人及其說明", led],
        ["現場勘察參考資料", s(R.get("surveyRefs") or "登記謄本、地籍圖")],
        ["勘察結論", ph(sv.get("useStatus")) + photos],
    ])  # fmt: skip


def basic_part(o: Out, e: Env) -> None:
    """貳、估價基本事項。"""
    c, R = e.c, e.R
    b = c["basic"]
    o.h1("貳、估價基本事項")
    o.h2("一、委託人")
    o.p(ph(b.get("client")))
    o.h2("二、勘估標的之基本資料")
    o.h3("（一）勘估標的內容")
    if e.has_parcels:
        o.table(
            ["地段", "地號", "使用分區", "面積(㎡)", "權利範圍", "面積(坪)"],
            _parcel_rows(e),
            align=["l", "l", "l", "r", "l", "r"],
        )
    if not e.land:
        _building_kv(o, e)
    o.p("評估之權利種類：所有權。")
    o.h3("（二）產權分析")
    o.kv([
        ["所有權人及權利範圍", ph(b.get("owner"))],
        ["他項權利", ph(b.get("encumbrance"))],
        ["限制登記", "依登記謄本，"
            + s(R.get("restrict") or "查無預告登記、查封等限制登記情事") + "。"],
    ])  # fmt: skip
    o.h2("三、價格日期及勘察日期")
    o.kv([["價格日期", roc(b.get("priceDate"))], ["勘察日期", roc(b.get("surveyDate"))]])
    o.h2("四、價格種類及估價條件")
    price_type = s(b.get("priceType")) + ("及特定價格" if e.k.get("special") else "")
    o.kv([["價格種類", price_type], ["估價條件", ph(b.get("conditions"))]])
    o.h2("五、估價目的")
    o.p(
        "本次估價結果作為勘估標的" + ph(b.get("purpose"))
        + "之參考，報告書所載價格僅限於該目的之參考，不適用於其他用途。"
    )  # fmt: skip
    o.h2("六、利益衝突之聲明")
    o.p(
        "本事務所及本所估價師與委託人、不動產所有權人或交易雙方僅為單純之業務關係，"
        "並無國際會計準則第 24 號所定之關係人或實質關係人之情事。"
    )
    o.h2("七、現況勘察情況說明")
    _survey_kv(o, e)
    o.h2("八、估價資料來源說明")
    o.list(DATA_SOURCES + ([s(R["dataSources"])] if truthy(R.get("dataSources")) else []))
    o.h2("九、其他負擔")
    o.p(s(R.get("otherBurden") or "無。"))


def _market_stats_line(o: Out, e: Env) -> None:
    """參之二：實價登錄成交統計一句。"""
    ms = e.ctx.get("marketStats")
    if not (ms and truthy(ms.get("n"))):
        return
    S = e.S
    o.p(
        "依本所蒐集之實價登錄資料，同一供需圈近期類似不動產成交 " + s(ms["n"])
        + " 筆，單價中位數約 " + unit_txt(ms.get("med"), S)
        + "，第 25～75 百分位約 " + unit_txt(ms.get("p25"), S)
        + "～" + unit_txt(ms.get("p75"), S) + "。"
    )  # fmt: skip


def _vat_table(o: Out, e: Env) -> None:
    """參之七：土地增值稅預估。"""
    pc = e.k["parcels"]
    o.h2("七、土地增值稅預估")
    rows = [
        [
            (r["p"].get("section") or "") + (r["p"].get("no") or ""),
            f(r["p"].get("annVal"), 0), f(r["p"].get("prevVal"), 1),
            f(r["p"].get("cpi"), 1) + "%", f(r["vat"]["tax"], 0),
        ]
        for r in pc["rows"]
    ]  # fmt: skip
    rows.append(["合計", "", "", "", f(pc["tax"], 0)])
    o.table(
        ["地號", "公告現值(元/㎡)", "前次移轉現值(元/㎡)", "物價指數", "增值稅(元)"],
        rows,
        align=["l", "r", "r", "r", "r"],
    )
    o.p(
        "依土地稅法第 33 條一般稅率（20%、30%、40%）計算，未考慮長期持有減徵、自用住宅用地等優惠，"
        "實際以稅捐機關核定為準。"
    )


def analysis_part(o: Out, e: Env) -> None:
    """參、價格形成之主要因素分析。"""
    c, R = e.c, e.R
    b, an = c["basic"], c["analysis"]
    o.h1("參、價格形成之主要因素分析")
    o.h2("一、一般因素分析")
    o.p(ph(an.get("general"), "一般因素"))
    o.h2("二、不動產市場概況分析")
    o.p(ph(R.get("market"), "市場供需、價格水準、交易概況"))
    _market_stats_line(o, e)
    o.h2("三、區域因素分析")
    o.p(ph(an.get("region"), "區域因素"))
    o.h2("四、個別因素分析")
    o.p(ph(an.get("indiv"), "個別因素"))
    o.h2("五、法定使用管制與其他管制事項")
    zone_rule = "；" + s(R["zoneRule"]) if truthy(R.get("zoneRule")) else ""
    o.p("勘估標的土地使用分區為" + ph(b.get("zone")) + zone_rule + "。")
    o.h2("六、最有效使用分析")
    o.p(ph(an.get("hbu"), "最有效使用"))
    if e.has_parcels:
        _vat_table(o, e)
