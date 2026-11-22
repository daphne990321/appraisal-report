"""摘要式報告書的封面與摘要表：坐落、評估價值、他項權利（對照舊版 buildSummary 前段）。"""

from typing import Any

from appraisal.domain.calc._js import truthy
from appraisal.domain.jsnum import js_round, n, to_number
from appraisal.domain.report.blocks import Out
from appraisal.domain.report.env import Env
from appraisal.domain.report.fmt import f, ph, roc, s, unit_txt
from appraisal.domain.report.survey import AREA_ROWS, LIEN_COLS

TBD = "⟦待填⟧"


def _ping(m2: Any) -> float:
    """平方公尺換算成坪（先加 1e-6 再四捨五入，與舊版相同）。"""
    return js_round(n(m2) * 0.3025 * 100 + 1e-6) / 100


def _area_txt(x: Any) -> str:
    return f(x, 2) if n(x) > 0 else "—"


def land_nos(e: Env) -> str:
    pc: Any = e.k.get("parcels")
    if e.has_parcels:
        return "、".join(
            (r["p"].get("section") or "") + (s(r["p"]["no"]) + " 地號" if r["p"].get("no") else "")
            for r in pc["rows"]
        )
    return ph(e.c["basic"].get("landNo"), "地號")


def _location_table(o: Out, e: Env, X: dict[str, Any]) -> None:
    """不動產坐落表與公設比說明。"""
    b = e.c["basic"]
    pc: Any = e.k.get("parcels")
    ar = X["area"] if isinstance(X.get("area"), dict) else {}
    total = common = 0.0
    for key, _ in AREA_ROWS:
        sqm = n(ar.get(key))
        total += sqm
        if key in ("common1", "common2", "other"):
            common += sqm
    hp = e.has_parcels
    rows = [[
        "土地", land_nos(e), f(pc["m2"], 2) if hp else "—", f(pc["ping"], 2) if hp else "—",
        ph(b.get("owner"), "所有權人"),
    ]]  # fmt: skip
    if not e.land:
        rows.append(["建物", ph(b.get("addr"), "地址"), "", "", ""])
        for key, label in AREA_ROWS:
            m = ar.get(key)
            main = key == "main"
            rows.append([
                label, ph(b.get("bldgNo"), "建號") if main else "—", _area_txt(m),
                f(_ping(m), 2) if n(m) > 0 else "—",
                ph(b.get("owner"), "所有權人") if main else "—",
            ])  # fmt: skip
        ratio = f(common / total * 100, 2) + "%" if total > 0 else "—"
        rows.append([
            "合計", "公設比 " + ratio, f(total, 2) if total > 0 else "—",
            f(_ping(total), 2) if total > 0 else "—", "",
        ])  # fmt: skip
    o.table(
        ["坐落及門牌", "地號／建號", "面積（㎡）", "面積（坪）", "所有權人"],
        rows,
        align=["l", "l", "r", "r", "l"],
        small=True,
    )
    if not e.land:
        o.p(
            "註：公設比為（公設Ⅰ＋公設Ⅱ＋其他獨立產權）÷（主建物＋附屬建物＋公設Ⅰ＋公設Ⅱ＋其他獨立產權）；"
            "依範本公式以謄本面積明細計算。"
        )


def _yuan_txt(y: Any) -> str:
    """元：空值與非數字為待填，否則四捨五入到整數。"""
    if y is None or (isinstance(y, float) and y != y):
        return TBD
    return f(js_round(to_number(y)), 0)


def _value_table(o: Out, e: Env) -> None:
    """評估價值及土地增值稅表。"""
    c, k, fin, S = e.c, e.k, e.fin, e.S
    pc: Any = k.get("parcels")
    o.h3("評估價值及土地增值稅")
    tax = pc["tax"] if e.has_parcels and n(pc.get("tax")) > 0 else None
    net = fin["yuan"] - tax if tax is not None and fin.get("yuan") is not None else None
    cost_on = bool(c["methods"].get("cost")) and k.get("cost") is not None
    whole = [
        unit_txt(fin.get("unit"), S),
        _yuan_txt(fin.get("yuan")),
        _yuan_txt(tax),
        _yuan_txt(net),
    ]
    if e.land:
        rows = [["土地", *whole]]
    else:
        rows = [
            [
                "土地", unit_txt(c["cost"].get("landUnit"), S) if cost_on else TBD,
                f(k["cost"].get("land"), 0) if cost_on else TBD, "—", "—",
            ],
            ["建物", TBD, f(k["cost"].get("building"), 0) if cost_on else TBD, "—", "—"],
            ["房地一體", *whole],
        ]  # fmt: skip
    o.table(
        ["項目", "單價", "總價（元）", "土地增值稅（元）", "淨值（元）"],
        rows,
        align=["l", "r", "r", "r", "r"],
        small=True,
    )
    if not e.land:
        o.kv([["不含車位建坪單價", TBD]])
        o.p(
            "註：車位價值：⟦待填⟧ 元，車位面積：⟦待填⟧ 坪。土地與建物分開之價格僅成本法有現成數值"
            "（土地為比較法求得、建物為成本價格），其餘待估價師填寫。"
        )


def liens_of(X: dict[str, Any]) -> list[dict[str, Any]]:
    return X["liens"] if isinstance(X.get("liens"), list) else []


def _lien_part(o: Out, e: Env, X: dict[str, Any]) -> None:
    """他項權利分析。"""
    b = e.c["basic"]
    liens = liens_of(X)
    o.h3("他項權利分析")
    if truthy(X.get("noLien")):
        o.kv([["備註", "無他項權利設定"]])
    elif liens:
        rows = [
            [label, *[s(x[key]) if key in x and x[key] != "" else "—" for x in liens]]
            for key, label in LIEN_COLS
        ]
        o.table(
            ["項目", *["第 " + str(i + 1) + " 筆" for i in range(len(liens))]], rows, small=True
        )
    else:
        o.kv([["他項權利", s(b["encumbrance"]) if b.get("encumbrance") else TBD]])


def front(o: Out, e: Env, X: dict[str, Any]) -> None:
    """封面與摘要表。"""
    b, a = e.c["basic"], e.c["appraiser"]
    o.add({
        "t": "cover", "office": a.get("office"),
        "title": "辦理金融機構不動產抵押貸款業務之不動產估價報告書",
        "rows": [
            ["案件編號", e.case_no], ["委託單位", ph(b.get("client"), "委託人")],
            ["勘估標的", ph(b.get("addr"), "勘估標的")], ["評估金額", fin_txt(e)],
            ["勘察日期", roc(b.get("surveyDate"))], ["價格日期", roc(b.get("priceDate"))],
        ],
    })  # fmt: skip
    o.pb()
    o.kv([["委託人", ph(b.get("client"), "委託人")], ["案件編號", e.case_no]])
    o.h3("不動產坐落")
    _location_table(o, e, X)
    _value_table(o, e)
    _lien_part(o, e, X)
    o.pb()


def fin_txt(e: Env) -> str:
    yuan = e.fin.get("yuan")
    return "⟦尚未決定⟧" if yuan is None else "新台幣 " + f(yuan, 0) + " 元"
