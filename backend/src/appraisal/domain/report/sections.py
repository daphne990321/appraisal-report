"""敘述式報告書肆之三：比較法的計算過程（對照舊版 compSection）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.report.blocks import Out
from appraisal.domain.report.env import Env
from appraisal.domain.report.fmt import f, num, pc, s, sg, unit_txt
from appraisal.domain.validate.format import lt


def _reg_section(o: Out, e: Env) -> None:
    """比較法：計量模型。"""
    k, S = e.k, e.S
    rg = k.get("reg")
    if not rg or rg.get("err"):
        o.p("⟦計量模型尚無法估計⟧")
        return
    p = "小於 0.0001" if lt(rg.get("p"), 0.0001) else f(rg.get("p"), 4)
    o.p(
        "以符合條件之成交案例 " + s(rg.get("n"))
        + " 筆為樣本，依變數為成交單價，採迴歸分析（§19(7)）。"
        "調整後判定係數 " + f(rg.get("adjR2"), 3) + "，整體顯著機率 " + p
        + "（§20）。推估比較價格為 "
        + unit_txt(k["comp"].get("unit"), S) + "。"
    )  # fmt: skip
    beta, se = rg["beta"], rg["se"]
    rows = [["常數", f(beta[0], 3), f(se[0], 3)]]
    for i, name in enumerate(rg["vars"]):
        rows.append([s(name), f(beta[i + 1], 3), f(se[i + 1], 3)])
    o.table(["變數", "係數", "標準誤"], rows, align=["l", "r", "r"])


def _cond_table(o: Out, e: Env, lbl: list[str]) -> None:
    """比較標的條件分析表。"""
    c, k, S = e.c, e.k, e.S
    b, comps = c["basic"], c["comps"]
    cond: list[tuple[str, list[str]]] = [
        ("位置", [s(cp.get("loc") or "") for cp in comps]),
        ("價格日期", [s(cp.get("date") or "") for cp in comps]),
        ("價格型態", ["擬售價格" if cp.get("priceType") == "ask" else "成交價格" for cp in comps]),
        ("資料來源", [s(cp.get("dataSrc") or cp.get("src") or "估價師蒐集") for cp in comps]),
    ]  # fmt: skip
    if k.get("isLand"):
        cond.append(("使用分區", [s(cp.get("zone") or "") for cp in comps]))
        cond.append(
            ("容積率", [f(cp["far"], 1) + "%" if truthy(cp.get("far")) else "—" for cp in comps])
        )
        cond.append(("面積(坪)", [f(cp.get("area"), 2) for cp in comps]))
    else:
        cond.append(("樓層", [s(cp.get("floor") or "") for cp in comps]))
        cond.append(
            ("屋齡(年)", ["—" if cp.get("age") == "" else s(cp.get("age")) for cp in comps])
        )
        cond.append(("面積(坪)", [f(cp.get("area"), 2) for cp in comps]))
    cond.append(("單價", [unit_txt(cp.get("price"), S) for cp in comps]))
    subject = {
        "容積率": f(c["comp"].get("subjFar"), 1) + "%",
        "面積(坪)": f(k.get("area") or b.get("area"), 2),
        "使用分區": s(b.get("zone") or ""),
        "價格日期": s(b.get("priceDate") or ""),
    }
    rows = [[label, subject.get(label, "—"), *vals] for label, vals in cond]
    o.table(["項目", "勘估標的", *lbl], rows, align=["l", "l", *["r"] * len(comps)])


class _AdjustTable:
    """比較價格調整試算表：每列是一個項目，每個比較標的一欄。"""

    def __init__(self, e: Env) -> None:
        self.e = e
        self.comps: list[dict[str, Any]] = e.c["comps"]
        self.rows_k: list[dict[str, Any]] = e.k["comp"]["rows"]
        self.is_d = e.c["comp"].get("method") == "diff"
        self.rows: list[list[str]] = []

    def line(self, label: str, fn: Any) -> None:
        self.rows.append([label, *[fn(cp, i) for i, cp in enumerate(self.comps)]])

    def cell(self, i: int, ident: str) -> str:
        it = next((x for x in self.rows_k[i]["items"] if x["id"] == ident), None)
        if self.is_d:
            return sg(it.get("v") if it else 0)
        return pc(it.get("pct") if it else 0)

    def cats(self, group: str) -> None:
        """某一組（region、indiv）的各項因素；經驗項目只列標的或比較標的有勾選者。"""
        for ind in [x for x in self.e.ctx.get("inds") or [] if x.get("group") == group]:
            cat = s(ind["cat"]) + "：" if truthy(ind.get("cat")) else ""
            self.line(cat + s(ind.get("name")), lambda _cp, i, ind=ind: self.cell(i, ind["id"]))
        flags = self.e.c.get("subjFlags") or {}
        for x in self.e.ctx.get("exp") or []:
            used = flags.get(x["id"]) or any(
                (cp.get("flags") or {}).get(x["id"]) for cp in self.comps
            )
            if x.get("group") == group and truthy(used):
                self.line(
                    "經驗：" + s(x.get("name")), lambda _cp, i, x=x: self.cell(i, "x:" + x["id"])
                )

    def head(self) -> None:
        """單價、議價空間、容積地價、情況調整與價格日期調整。"""
        S, rk = self.e.S, self.rows_k
        self.line("單價", lambda cp, i: unit_txt(cp.get("price"), S))
        if any(cp.get("priceType") == "ask" for cp in self.comps):
            self.line("議價空間", lambda cp, i: self._bargain(cp))
        if self.e.k.get("isLand") and self.e.c["comp"].get("volumeBasis"):
            self.line("容積地價（每 100% 容積）", lambda cp, i: self._vol_price(rk[i]))
        self.line("情況調整(A)", lambda cp, i: pc(rk[i].get("cond")))
        self.line("價格日期調整(B)", lambda cp, i: pc(rk[i].get("date")))

    def _bargain(self, cp: dict[str, Any]) -> str:
        return "−" + f(cp.get("bargain"), 1) + "%" if cp.get("priceType") == "ask" else "—"

    def _vol_price(self, row: dict[str, Any]) -> str:
        return "—" if row.get("volPrice") is None else unit_txt(row["volPrice"], self.e.S)

    def adjust(self, label: str, diff_key: str, pct_key: str, group: str) -> None:
        """某組因素列加上該組的小計列（區域因素調整(C)、個別因素調整(D)）。"""
        rk = self.rows_k
        self.cats(group)
        self.line(
            label,
            lambda cp, i: sg(rk[i].get(diff_key)) if self.is_d else pc(rk[i].get(pct_key)),
        )

    def tail(self) -> None:
        """總調整率、差異加總、試算價格與權重。"""
        S, rk = self.e.S, self.rows_k
        self.line("總調整率", lambda cp, i: f(num(rk[i].get("factor")) * 100, 2) + "%")
        self.line("差異百分率絕對值加總", lambda cp, i: f(rk[i].get("absSum"), 1))
        self.line("試算價格", lambda cp, i: unit_txt(rk[i].get("trial"), S))
        self.line(
            "權重",
            lambda cp, i: f(rk[i].get("weight"), 0) + "%" if rk[i].get("usable") else "不採用",
        )


def _adjust_rows(e: Env) -> list[list[str]]:
    """比較價格調整試算表的列。"""
    t = _AdjustTable(e)
    t.head()
    t.adjust("區域因素調整(C)", "rv", "r", "region")
    t.adjust("個別因素調整(D)", "iv", "i", "indiv")
    t.tail()
    return t.rows


def comp_section(o: Out, e: Env, no: str) -> None:
    """（N）比較法。"""
    c, k, S = e.c, e.k, e.S
    comp = c["comp"]
    is_d = comp.get("method") == "diff"
    o.h3("（" + no + "）比較法")
    if e.ctx.get("selText"):
        o.p(e.ctx["selText"])
    if comp.get("method") == "reg":
        _reg_section(o, e)
        return
    if not c["comps"]:
        o.p("⟦尚未選擇比較標的⟧")
        return
    grade = "（劣、較劣、稍劣、相當、稍優、較優、優）" if comp.get("inputMode") == "grade" else ""
    volume = (
        "土地比較標的先換算為每 100% 容積地價，再乘以勘估標的允建容積率 "
        + f(comp.get("subjFar"), 1)
        + "%。"
        if k.get("isLand") and comp.get("volumeBasis")
        else ""
    )
    o.p(
        "區域因素及個別因素調整以" + ("差額法" if is_d else "百分率法")
        + "為之（§24），依優劣程度評定差異"
        + grade + "；總調整率以「(1＋情況)×(1＋價格日期)×(1＋區域)×(1＋個別)」連乘計算。" + volume
    )  # fmt: skip
    lbl = ["比較標的 " + s(cp.get("label")) for cp in c["comps"]]
    o.h3("比較標的條件分析表")
    _cond_table(o, e, lbl)
    o.h3("比較價格調整試算表")
    o.table(["項目", *lbl], _adjust_rows(e), align=["l", *["r"] * len(c["comps"])], small=True)
    mode = S.get("weightMode")
    how = (
        "依各比較標的差異百分率絕對值加總與其平均值之偏離率計算"
        if mode == "deviation"
        else "依總調整率反比分配"
        if mode == "inverse"
        else "依資料可信度、總調整率及差異程度決定"
    )
    cc = k["comp"]
    o.p(
        "採用比較標的 " + s(cc.get("usedCount")) + " 件（§27），試算價格差距 " + f(cc.get("gap"), 2)
        + "%（§26）。比較標的權重" + how + "，求得比較價格為 " + unit_txt(cc.get("unit"), S) + "。"
    )  # fmt: skip
