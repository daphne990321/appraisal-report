"""敘述式報告書：地號價格表、土地開發分析法與特定價格（對照舊版 parcelTable 等）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import js_round, n
from appraisal.domain.report.blocks import Out
from appraisal.domain.report.env import Env
from appraisal.domain.report.fmt import f, num, pc, s, unit_txt


def _total_txt(total: Any) -> str:
    """總價（元）：沒有值得「—」，否則四捨五入到整數。"""
    return "—" if total is None else f(js_round(num(total)), 0)


def _price_mode(p: dict[str, Any]) -> str:
    """計價方式的說明文字。"""
    mode = p.get("priceMode")
    if mode == "announced":
        return "公告現值 " + f(p.get("annPct"), 0) + "%"
    if mode == "manual":
        return "個別評定"
    return "基地單價 " + pc(p.get("adjPct"), 1) if n(p.get("adjPct")) else "基地單價"


def parcel_table(o: Out, e: Env, parcels: dict[str, Any], caption: str) -> None:
    """地號價格明細表（含標題）。"""
    o.h3(caption)
    rows = [
        [
            s(r["p"].get("section") or ""), s(r["p"].get("no") or ""), s(r["p"].get("zone") or ""),
            f(r["ping"], 4), unit_txt(r.get("unit"), e.S), _total_txt(r.get("total")),
            _price_mode(r["p"]),
        ]
        for r in parcels["rows"]
    ]  # fmt: skip
    rows.append(["合計", "", "", f(parcels["ping"], 4), "", _total_txt(parcels.get("total")), ""])
    o.table(
        ["地段", "地號", "使用分區", "面積(坪)", "單價", "總價(元)", "計價方式"],
        rows,
        align=["l", "l", "l", "r", "r", "r", "l"],
    )


def _land_detailed(o: Out, e: Env, ld: dict[str, Any], Ld: dict[str, Any]) -> None:
    """土地開發分析法詳細版：規劃資料與銷售金額表。"""
    S = e.S
    bonus = "（含獎勵 " + f(Ld.get("bonus"), 1) + "%）" if n(Ld.get("bonus")) else ""
    o.kv([
        ["基地面積", f(n(Ld.get("site")) or e.k.get("area"), 2) + " 坪"],
        ["允建容積率", f(Ld.get("far"), 1) + "%" + bonus],
        [
            "規劃樓層",
            "地上 " + s(Ld.get("floorsAbove")) + " 層、地下 " + s(Ld.get("floorsBelow")) + " 層",
        ],
        ["容積樓地板面積", f(ld.get("farFloor"), 2) + " 坪"],
        [
            "總樓地板面積",
            f(ld.get("total"), 2) + " 坪（地上 " + f(ld.get("above"), 2) + "、地下 "
            + f(ld.get("below"), 2) + "）",
        ],
        ["可銷售面積", f(ld.get("saleable"), 2) + " 坪"],
        ["停車位", f(ld.get("cars")) + " 個 × " + f(Ld.get("carPrice")) + " 萬元"],
    ])  # fmt: skip
    o.h3("銷售金額（比準層單價 × 樓層別效用比）")
    rows = [
        [
            s(x.get("f")) + "F", f(x.get("area"), 2), f(x.get("util"), 0) + "%",
            unit_txt(x.get("unit"), S), f(num(x.get("amt")) / 10000, 2),
        ]
        for x in ld["floors"]
    ]  # fmt: skip
    if truthy(ld.get("cars")):
        rows.append(["車位", s(ld["cars"]) + " 個", "", "", f(num(ld.get("carAmt")) / 10000, 2)])
    rows.append(["合計", "", "", "", f(num(ld.get("S")) / 10000, 2)])
    o.table(
        ["樓層", "銷售面積(坪)", "效用比", "單價", "金額（萬元）"],
        rows,
        align=["l", "r", "r", "r", "r"],
        small=True,
    )
    o.p(
        "比準層單價以比較法求取為 "
        + unit_txt(Ld.get("baseUnit"), S)
        + "（比準層 "
        + s(Ld.get("baseFloor") or 4)
        + " 樓）。"
    )


def _cost_rows(ld: dict[str, Any], Ld: dict[str, Any]) -> list[list[str]]:
    """成本與價格推算表列。"""
    detail = ""
    if ld.get("detailed"):
        idx = n(Ld.get("conIndex"))
        index_txt = " × " + f(Ld.get("conIndex"), 2) + "%" if idx and idx != 100 else ""
        detail = (
            " " + f(ld.get("total"), 2) + " 坪 × " + f(Ld.get("conUnit"), 2) + " 萬元" + index_txt
        )
    fee_pct = n(Ld.get("adSell")) + n(Ld.get("mgmt")) + n(Ld.get("tax"))
    return [
        ["總銷售金額 S", f(ld.get("S"))],
        ["直接成本 C（營造施工費" + detail + "）", f(ld.get("C"))],
        ["規劃設計費（" + f(Ld.get("design"), 1) + "% × C）", f(ld.get("design"))],
        ["廣告銷售、管理、稅捐（" + f(fee_pct, 1) + "% × S）", f(ld.get("saleFees"))],
        ["間接成本 M", f(ld.get("M"))],
        ["利潤率 R", f(num(ld.get("R")) * 100, 2) + "%"],
        ["資本利息綜合利率 i", f(num(ld.get("i")) * 100, 2) + "%"],
        ["土地開發分析價格 V", f(ld.get("V"))],
    ]  # fmt: skip


def _interest_table(o: Out, ld: dict[str, Any], Ld: dict[str, Any]) -> None:
    """資本利息綜合利率表。"""
    ci = ld["ci"]
    o.table(
        ["資本利息", "比例", "利率", "說明"],
        [
            [
                "自有資金", f(Ld.get("ownRatio"), 0) + "%", f(Ld.get("ownRate"), 2) + "%",
                "一年期定存利率",
            ],
            [
                "借貸資金", f(100 - n(Ld.get("ownRatio")), 0) + "%", f(Ld.get("loanRate"), 2) + "%",
                "一般放款利率",
            ],
            [
                "建築投資（工期 " + s(Ld.get("buildMonths")) + " 個月 × ½）",
                f(num(ci.get("wBld")) * 100, 2) + "%",
                f(num(ci.get("bRate")) * 100, 2) + "%", "依投資額加權",
            ],
            [
                "土地投資（持有 " + s(Ld.get("landMonths")) + " 個月）",
                f(num(ci.get("wLand")) * 100, 2) + "%",
                f(num(ci.get("lRate")) * 100, 2) + "%", "依投資額加權",
            ],
            ["綜合利率", "", f(num(ld.get("i")) * 100, 2) + "%", "預售收入不計息（§58、§59）"],
        ],
        align=["l", "r", "r", "l"],
    )  # fmt: skip


def land_section(o: Out, e: Env, no: str) -> None:
    """（N）土地開發分析法。"""
    ld, Ld, S = e.k["land"], e.c["land"], e.S
    o.h3("（" + no + "）土地開發分析法")
    o.p(
        "V ＝ S ÷（1＋R）÷（1＋i）−（C＋M）（§81）。"
        "其中 S 為開發後預期總銷售金額，R 為適當之利潤率，"
        "i 為資本利息綜合利率，C 為直接成本，M 為間接成本。"
    )
    if ld.get("detailed"):
        _land_detailed(o, e, ld, Ld)
    else:
        rows = [
            [
                s(x.get("name")), f(x.get("ping"), 2), unit_txt(x.get("unit"), S),
                f(n(x.get("ping")) * n(x.get("unit")) * 10000),
            ]
            for x in Ld["sales"]
        ]  # fmt: skip
        o.table(["銷售項目", "面積(坪)", "單價", "金額（元）"], rows, align=["l", "r", "r", "r"])
    o.table(["項目", "金額（元）"], _cost_rows(ld, Ld), align=["l", "r"])
    if ld.get("ci") is not None:
        _interest_table(o, ld, Ld)
    o.p("土地開發分析價格為 " + unit_txt(ld.get("unit"), S) + "。")


def special_section(o: Out, e: Env) -> None:
    """特定價格：完成時價格與折現。"""
    sp, cs, S = e.k["special"], e.c["special"], e.S
    o.h3("特定價格：" + s(cs.get("label") or "特定條件"))
    o.p(
        "依估價條件，以允建容積率 " + f(cs.get("far"), 1) + "% 試算完成時價格：比較法 "
        + unit_txt(sp["comp"].get("unit"), S) + "、土地開發分析法 "
        + unit_txt(sp["land"].get("unit"), S)
        + "，加權後為 " + unit_txt(sp.get("done"), S) + "。"
    )  # fmt: skip
    if n(cs.get("years")) > 0:
        wacc = (
            ""
            if cs.get("rateMode") == "input"
            else "（加權平均資金成本 "
            + f(sp.get("wacc"), 2)
            + "%＋流通性、風險性、增值性、管理性溢酬）"
        )
        o.p(
            "再以折現率 " + f(sp.get("rate"), 2) + "%" + wacc + "折現 " + f(cs.get("years"), 1)
            + " 年，折現比例 " + f(num(sp.get("df")) * 100, 2) + "%，決定特定價格為 "
            + unit_txt(sp.get("unit"), S) + "，總價 " + s(e.sp_amt) + "。"
        )  # fmt: skip
