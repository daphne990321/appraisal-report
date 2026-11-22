"""摘要式報告書的估價方法試算表（對照舊版 buildSummary 內的 compTable、incomeTable、costTable）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import js_round, n
from appraisal.domain.report.blocks import Out
from appraisal.domain.report.env import Env
from appraisal.domain.report.fmt import f, num, ph, roc, s, sg, unit_txt

MAX_COMPS = 6


def _rate(x: Any) -> str:
    """百分率法的調整率：100 加上調整百分比。"""
    return f(100 + n(x), 2) + "%"


def _comp_rows(e: Env, idx: list[int]) -> list[list[str]]:
    """比較法試算表的各列。"""
    c, k, S = e.c, e.k, e.S
    is_d = c["comp"].get("method") == "diff"
    comps, rows_k = c["comps"], k["comp"]["rows"]

    def line(label: str, fn: Any) -> list[str]:
        return [label, *[fn(comps[i], rows_k[i]) for i in idx]]

    def adj(pct_v: Any, diff_v: Any) -> str:
        return sg(diff_v) if is_d else _rate(pct_v)

    def total_price(cp: dict[str, Any], r: dict[str, Any]) -> str:
        ok = n(cp.get("area")) > 0 and n(cp.get("price")) > 0
        return f(n(cp.get("area")) * n(cp.get("price")), 0) if ok else "—"

    def weighted(cp: dict[str, Any], r: dict[str, Any]) -> str:
        if not r.get("usable"):
            return "—"
        return unit_txt(n(r.get("trial")) * n(r.get("weight")) / 100, S)

    def weight(cp: dict[str, Any], r: dict[str, Any]) -> str:
        return f(r.get("weight"), 0) + "%" if r.get("usable") else "不採用"

    def age(cp: dict[str, Any], r: dict[str, Any]) -> str:
        return "—" if "age" not in cp or cp["age"] == "" else s(cp["age"])

    return [
        line("坐落", lambda cp, r: s(cp.get("loc") or "—")),
        line("面積（坪）", lambda cp, r: f(cp.get("area"), 2)),
        line("屋齡（年）", age),
        line("樓層", lambda cp, r: s(cp.get("floor") or "—")),
        line("單價（萬元/坪）", lambda cp, r: f(cp.get("price"), S.get("unitDec"))),
        line("總價（萬元）", total_price),
        line("資料來源", lambda cp, r: s(cp.get("dataSrc") or cp.get("src") or "估價師蒐集")),
        line("價格日期", lambda cp, r: s(cp.get("date") or "—")),
        line("價格種類", lambda cp, r: "擬售價" if cp.get("priceType") == "ask" else "成交價"),
        line("情況因素調整率", lambda cp, r: adj(r.get("cond"), r.get("cond"))),
        line("價格日期調整率", lambda cp, r: adj(r.get("date"), r.get("date"))),
        line("區域因素調整率", lambda cp, r: adj(r.get("r"), r.get("rv"))),
        line("個別因素調整率", lambda cp, r: adj(r.get("i"), r.get("iv"))),
        line("試算價格（萬元/坪）", lambda cp, r: unit_txt(r.get("trial"), S)),
        line("個案調整權重", weight),
        line("加權後價格（萬元/坪）", weighted),
    ]  # fmt: skip


def comp_table(o: Out, e: Env) -> None:
    """比較法試算表。"""
    c, k, S = e.c, e.k, e.S
    cc = k["comp"]
    o.h3("比較法試算表")
    if c["comp"].get("method") == "reg":
        rg = k.get("reg")
        if not rg or rg.get("err"):
            o.p("⟦計量模型尚無法估計⟧")
        else:
            o.p(
                "採迴歸分析，樣本 "
                + s(rg.get("n"))
                + " 筆，調整後判定係數 "
                + f(rg.get("adjR2"), 3)
                + "。"
            )
        o.p("推定比較價格：" + unit_txt(cc.get("unit"), S))
        return
    comps = c["comps"]
    if not comps or not cc.get("rows"):
        o.p("⟦尚未選擇比較標的⟧")
        return
    idx: list[int] = []
    for i, cp in enumerate(comps):
        if cp.get("include") is not False and len(idx) < MAX_COMPS:
            idx.append(i)
    more = len(comps) - len(idx)
    is_d = c["comp"].get("method") == "diff"
    head = ["項次", *["比較標的 " + s(comps[i].get("label") or i + 1) for i in idx]]
    o.table(head, _comp_rows(e, idx), align=["l", *["r"] * len(idx)], small=True)
    if more > 0:
        o.p("另有 " + str(more) + " 件比較標的未列於本表（表格最多列 6 件）。")
    if is_d:
        o.p("調整欄位為差額法之加減金額（萬元/坪）。")
    o.p(
        "推定比較價格："
        + unit_txt(cc.get("unit"), S)
        + "；經各項影響因素分析調整後，建坪單價以每坪 "
        + f(js_round(n(cc.get("unit")) * 10000), 0)
        + " 元評估。"
    )
    why = [
        "比較標的 " + s(comps[i].get("label") or i + 1) + "：" + s(comps[i]["condReason"])
        for i in idx
        if truthy(comps[i].get("condReason"))
    ]
    o.p("調整說明：" + ("；".join(why) if why else "⟦待填⟧"))


def income_table(o: Out, e: Env) -> None:
    """收益法試算表。"""
    ic, inc, S = e.k["inc"], e.c["income"], e.S
    b = e.c["basic"]
    area = n(e.k.get("area") or b.get("area"))
    tot = num(ic.get("egi")) - num(ic.get("noi"))
    dcf = inc.get("method") == "dcf"
    o.h3("收益法試算表（" + ("折現現金流量分析法" if dcf else "直接資本化法") + "）")
    if dcf:
        D = inc["dcf"]
        o.p(
            "本案收益法採折現現金流量分析法（DCF）：分析期間 " + f(D.get("years")) + " 年，折現率 "
            + f(D.get("disc"), 2) + "%，期末資本化率 " + f(D.get("termCap"), 2)
            + "%；收益價格 新台幣 "
            + f(ic.get("price"), 0) + " 元（建坪單價 " + unit_txt(ic.get("unit"), S) + "）。"
        )  # fmt: skip
        return
    hotel = truthy(ic.get("hotel"))
    egi_pos = num(ic.get("egi")) > 0
    o.table(
        ["項目", "內容"],
        [
            ["勘估標的面積（坪）", f(area, 2)],
            ["評估毛租金（元/月）", "—" if hotel else f(ic.get("rent"), 0)],
            [
                "評估毛租金（元/坪/月）",
                "—" if hotel or not area > 0 else f(num(ic.get("rent")) / area, 0),
            ],
            ["總收入（元/年）", f(ic.get("gross"), 0)],
            ["押金或保證金利息及其他收入（元/年）", f(ic.get("other"), 0)],
            [
                "空置及其他損失",
                "—"
                if hotel
                else f(inc.get("vacMonths"), 1) + " 個月（" + f(ic.get("loss"), 0) + " 元/年）",
            ],
            ["有效總收入（元/年）", f(ic.get("egi"), 0)],
            ["費用率", f(tot / num(ic["egi"]) * 100, 2) + "%" if egi_pos else "—"],
            ["總費用（元/年，含建物折舊提存費）", f(tot, 0)],
            ["淨收入（元/年）", f(ic.get("noi"), 0)],
            ["收益資本化率（%）", f(ic.get("cap"), 2)],
            ["收益價格（元）", f(ic.get("price"), 0)],
            ["收益單價（元/坪）", f(js_round(n(ic.get("unit")) * 10000), 0)],
        ],
        align=["l", "r"],
    )  # fmt: skip


def _cost_head(e: Env) -> list[list[str]]:
    """成本法試算表前段：結構、土地、營造單價與直接成本。"""
    ct, K, S = e.k["cost"], e.c["cost"], e.S
    b = e.c["basic"]
    extra_land = (
        "＋其他土地 " + f(ct["extraLand"], 0) + " 元" if truthy(ct.get("extraLand")) else ""
    )
    if K.get("conMethod") == "items":
        con = "工程造價項目法"
    else:
        idx = (
            "（× 物價指數 " + f(num(ct.get("idx")) * 100, 2) + "%）"
            if n(ct.get("idx")) != 1
            else ""
        )
        con = f(js_round(n(K.get("unitCost")) * 10000), 0) + idx
    rows = [
        ["建物結構", ph(b.get("floorDesc"), "結構"), ""],
        [
            "標的樓層/總樓層",
            s(b.get("floorNum") or "—") + "／" + s(b.get("totalFloors") or "—"), "",
        ],
        [
            "土地價格",
            "土地單價 " + unit_txt(K.get("landUnit"), S) + " × " + f(b.get("landShare"), 2)
            + " 坪" + extra_land,
            f(ct.get("land"), 0),
        ],
        ["營造或施工單價（元/坪）", con, ""],
        ["建物總面積（坪）", f(e.k.get("area") or b.get("area"), 2), ""],
        ["直接成本：總值（元）", "", f(ct.get("construction"), 0)],
    ]  # fmt: skip
    if truthy(ct.get("extras")):
        rows.append(["附加成本（裝修、設備等）", "", f(ct["extras"], 0)])
    return rows


def _cost_tail(e: Env) -> list[list[str]]:
    """成本法試算表後段：間接成本、利息、利潤、折舊與價格。"""
    ct, K = e.k["cost"], e.c["cost"]
    b = e.c["basic"]
    return [
        ["規劃設計費", "建物直接成本之 " + f(K.get("design"), 1) + "%", f(ct.get("design"), 0)],
        [
            "廣告銷售費、管理費、稅捐及其他負擔",
            "建築總成本之 " + f(K.get("adSell"), 1) + "%、" + f(K.get("mgmt"), 1) + "%、"
            + f(K.get("tax"), 1) + "%（合計）",
            f(ct.get("fees"), 0),
        ],
        ["間接成本小計", "", f(n(ct.get("design")) + n(ct.get("fees")), 0)],
        [
            "資本利息", "建築直接成本與間接成本之 " + f(K.get("interest"), 2) + "%",
            f(ct.get("interest"), 0),
        ],
        ["建物建築利潤", "建物總成本之 " + f(K.get("profit"), 1) + "%", f(ct.get("profit"), 0)],
        ["建物總成本（元）", "", f(ct.get("T"), 0)],
        ["建築完成日期", roc(b.get("completed")), ""],
        ["屋齡（年）", f(ct.get("age")), ""],
        ["耐用年數（年）", f(K.get("life")), ""],
        ["建物殘值價格率（%）", f(K.get("salvage"), 1), ""],
        ["累積折舊", "", "−" + f(ct.get("dep"), 0)],
        ["建物成本價格（元）", "", f(ct.get("building"), 0)],
        ["房地成本價格（元）", "", f(ct.get("price"), 0)],
    ]  # fmt: skip


def cost_table(o: Out, e: Env) -> None:
    """成本法試算表。"""
    o.h3("成本法試算表")
    o.table(
        ["項目", "內容", "金額（元）"],
        [*_cost_head(e), *_cost_tail(e)],
        align=["l", "l", "r"],
        small=True,
    )
