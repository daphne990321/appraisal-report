"""敘述式報告書肆之三：收益法與成本法的計算過程（對照舊版 incomeSection、costSection）。"""

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import n
from appraisal.domain.report.blocks import Out
from appraisal.domain.report.env import Env
from appraisal.domain.report.fmt import f, num, ph, s, unit_txt


def _income_rows(e: Env) -> list[list[str]]:
    """收益法的收支表列。"""
    ic, inc = e.k["inc"], e.c["income"]
    rows = [["總收入", f(ic.get("gross"))]]
    if not ic.get("hotel"):
        rows.append(
            ["閒置及收租損失（" + f(inc.get("vacMonths"), 1) + " 個月）", "−" + f(ic.get("loss"))]
        )
    rows.append(["有效總收入", f(ic.get("egi"))])
    for x in inc["exp"]:
        rows.append([s(x.get("name") or "費用"), "−" + f(x.get("amt"))])
    if n(ic.get("expMult")) != 1:
        extra = num(ic.get("expRaw")) * (num(ic.get("expMult")) - 1)
        rows.append(["費用加成（× " + f(ic.get("expMult"), 2) + "）", "−" + f(extra)])
    if truthy(ic.get("pctPart")):
        opex, mgmt = n(inc.get("opexPct")), n(inc.get("mgmtPct"))
        label = (
            ("營業費用及成本 " + f(inc.get("opexPct"), 1) + "%" if opex else "")
            + ("、" if opex and mgmt else "")
            + ("管理費 " + f(inc.get("mgmtPct"), 1) + "%" if mgmt else "")
        )
        rows.append([label, "−" + f(ic["pctPart"])])
    rows.append(["建物折舊提存費", "−" + f(ic.get("dep"))])
    rows.append(["淨收益（第 1 年）", f(ic.get("noi"))])
    return rows


def _dcf_part(o: Out, e: Env) -> None:
    """收益法：折現現金流量分析的說明與逐年表。"""
    ic, D, S = e.k["inc"], e.c["income"]["dcf"], e.S
    growth = (
        "前 "
        + s(D["switchYear"])
        + " 年 "
        + f(D.get("rentGrowth"), 1)
        + "%、其後 "
        + f(D.get("rentGrowth2"), 1)
        + "%"
        if n(D.get("switchYear"))
        else " " + f(D.get("rentGrowth"), 1) + "%"
    )
    o.p(
        "分析期間 " + s(D.get("years")) + " 年，折現率 " + f(D.get("disc"), 2) + "%；收入年成長率"
        + growth + "；期末價值以第 " + s(n(D.get("years")) + 1) + " 年淨收益 ÷ 期末資本化率 "
        + f(D.get("termCap"), 2) + "%，扣除處分費用 " + f(D.get("sellCost"), 1) + "%（§31、§32）。"
    )  # fmt: skip
    t = ic["terminal"]
    rows = [
        [
            s(x.get("k")), f(x.get("egi")), f(num(x.get("exp")) + num(x.get("dep"))),
            f(x.get("cf")), f(x.get("pv")),
        ]
        for x in ic["flows"]
    ]  # fmt: skip
    rows.append(["期末", "", "", "期末價值 " + f(t.get("value")), f(t.get("pv"))])
    o.table(
        ["年期", "有效總收入", "總費用", "淨收益", "現值"],
        rows,
        align=["l", "r", "r", "r", "r"],
        small=True,
    )
    o.p(
        "收益價格 ＝ 各期淨收益現值合計 " + f(t.get("pvFlows"))
        + " 元 ＋ 期末價值現值 " + f(t.get("pv"))
        + " 元 ＝ " + f(ic.get("price")) + " 元（" + unit_txt(ic.get("unit"), S) + "）。"
    )  # fmt: skip


def income_section(o: Out, e: Env, no: str) -> None:
    """（N）收益法。"""
    ic, inc, S = e.k["inc"], e.c["income"], e.S
    dcf = inc.get("method") == "dcf"
    o.h3("（" + no + "）收益法（" + ("折現現金流量分析法" if dcf else "直接資本化法") + "）")
    if ic.get("hotel"):
        o.p(
            "勘估標的為營業中旅館，以客房收入推估總收入：客房數 " + f(inc.get("rooms"))
            + " 間 × 平均房價 "
            + f(inc.get("adr")) + " 元 × 365 日 × 住房率 " + f(inc.get("occ"), 1) + "% ＝ "
            + f(ic.get("roomRev")) + " 元；其他收入以客房收入 "
            + f(inc.get("otherPct"), 1) + "% 計。"
            + (s(inc["rentSource"]) + "。" if truthy(inc.get("rentSource")) else "")
        )  # fmt: skip
    else:
        o.p(
            "月租金 "
            + f(inc.get("rent"))
            + " 元，"
            + ph(inc.get("rentSource"), "租金來源")
            + "（§36、§37）。"
        )
    o.table(["項目", "金額（元）"], _income_rows(e), align=["l", "r"])
    if dcf and ic.get("flows") is not None:
        _dcf_part(o, e)
    else:
        o.p(
            "收益資本化率 " + f(ic.get("cap"), 2) + "%（" + s(e.ctx.get("capName") or "")
            + "），收益價格 ＝ 淨收益 ÷ 收益資本化率 ＝ " + f(ic.get("price")) + " 元（"
            + unit_txt(ic.get("unit"), S) + "）。"
        )  # fmt: skip


_DEP_NAMES = {
    "straight": "等速折舊（定額法）",
    "declining": "初期加速折舊（定率法）",
    "sinking": "初期減速折舊（償債基金法）",
}


def _cost_rows(e: Env) -> list[list[str]]:
    """成本法的成本表列。"""
    ct, K, S = e.k["cost"], e.c["cost"], e.S
    b = e.c["basic"]
    rows = [
        ["營造施工費", f(ct.get("construction"))],
        ["規劃設計費（" + f(K.get("design"), 1) + "%）", f(ct.get("design"))],
    ]
    if truthy(ct.get("extras")):
        rows.append(["附加成本（裝修、設備等）", f(ct["extras"])])
    rows += [
        ["廣告銷售、管理、稅捐", f(ct.get("fees"))],
        ["資本利息（" + f(K.get("interest"), 2) + "%）", f(ct.get("interest"))],
        ["開發或建築利潤（" + f(K.get("profit"), 1) + "%）", f(ct.get("profit"))],
        ["建物總成本", f(ct.get("T"))],
        [
            "累積折舊（" + f(ct.get("age")) + "／" + f(K.get("life")) + " 年）",
            "−" + f(ct.get("dep")),
        ],
    ]  # fmt: skip
    if truthy(ct.get("extrasDep")):
        rows.append(["附加成本累積折舊", "−" + f(ct["extrasDep"])])
    extra_land = "＋其他土地 " + f(ct["extraLand"]) if truthy(ct.get("extraLand")) else ""
    rows += [
        ["建物成本價格", f(ct.get("building"))],
        [
            "土地價格（比較法，" + unit_txt(K.get("landUnit"), S) + " × " + f(b.get("landShare"), 2)
            + " 坪" + extra_land + "）",
            f(ct.get("land")),
        ],
        ["房地成本價格", f(ct.get("price"))],
    ]  # fmt: skip
    return rows


def cost_section(o: Out, e: Env, no: str) -> None:
    """（N）成本法。"""
    ct, K, S = e.k["cost"], e.c["cost"], e.S
    o.h3("（" + no + "）成本法")
    if K.get("conMethod") == "items":
        con = "工程造價項目法（直接法）"
    else:
        idx = (
            " × 營造工程物價指數 " + f(num(ct.get("idx")) * 100, 2) + "%"
            if n(ct.get("idx")) != 1
            else ""
        )
        note = "，依" + s(K["unitCostNote"]) if truthy(K.get("unitCostNote")) else ""
        con = "單位面積比較法（間接法），單價每坪 " + f(K.get("unitCost"), 2) + " 萬元" + idx + note
    o.p("營造施工費採" + con + "；累積折舊採" + s(_DEP_NAMES.get(K.get("depMethod"))) + "（§68）。")
    o.table(["項目", "金額（元）"], _cost_rows(e), align=["l", "r"])
    o.p(
        "房地成本價格為 "
        + f(ct.get("price"))
        + " 元（"
        + unit_txt(ct.get("unit"), S)
        + "）。土地價格以比較法求取（§69 II）。"
    )
