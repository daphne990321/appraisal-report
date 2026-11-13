"""收益法：資本化率、直接資本化法與收益折現法（不動產估價技術規則第 35 條以下）。"""

from typing import Any

from appraisal.domain.calc._js import js_div, js_pow, js_sum, missing_or_empty, truthy
from appraisal.domain.jsnum import js_round, n, round_to


def loan_constant(rate: Any, years: Any) -> float:
    """貸款常數（對應 loanConstant）。"""
    r = n(rate) / 100
    t = n(years)
    if t <= 0:
        return 0.0
    if r == 0:
        return 1 / t
    return js_div(r, 1 - js_pow(1 + r, -t))


def cap_rate(inc: dict[str, Any]) -> float:
    """資本化率（對應 capRate）；依 capMode 選用六種求法。"""
    m = inc.get("capMode")
    if m == "risk":
        r = inc["risk"]
        return (
            n(r.get("base"))
            + n(r.get("liquidity"))
            + n(r.get("risk"))
            + n(r.get("growth"))
            + n(r.get("mgmt"))
        )
    if m == "extract":
        rows = [x for x in inc["extract"] if n(x.get("price")) > 0]
        if not rows:
            return 0.0
        return js_sum(rows, lambda x: n(x.get("noi")) / n(x.get("price")) * 100) / len(rows)
    if m == "wacc":
        return js_sum(inc["wacc"], lambda x: n(x.get("w")) / 100 * n(x.get("k")))
    if m == "dcr":
        d = inc["dcr"]
        return (
            n(d.get("dcr"))
            * loan_constant(d.get("rate"), d.get("years"))
            * n(d.get("ltv"))
            / 100
            * 100
        )
    if m == "egim":
        e = inc["egim"]
        return n(e.get("nir")) / n(e.get("egim")) if n(e.get("egim")) > 0 else 0.0
    return n(inc.get("cap"))


def discount_factor(rate: Any, years: Any) -> float:
    """折現比例（對應 discountFactor）。"""
    return js_div(1, js_pow(1 + n(rate) / 100, n(years)))


def _dcf(
    inc: dict[str, Any], egi: float, exp_raw: float, mult: float, dep: float, pct_cost: Any
) -> tuple[float, list[dict[str, Any]], dict[str, float]]:
    """收益折現法：逐年現金流與期末價值（對應 incomeCalc 的 dcf 分支）。"""
    d = inc["dcf"]
    y = n(d.get("disc")) / 100
    years = int(max(1, js_round(n(d.get("years")))))
    dep_in = dep if truthy(d.get("deductDep")) else 0
    sw = n(d.get("switchYear")) if n(d.get("switchYear")) > 0 else years
    g1 = n(d.get("rentGrowth")) / 100
    g2 = (
        n(d.get("rentGrowth")) if missing_or_empty(d, "rentGrowth2") else n(d["rentGrowth2"])
    ) / 100
    flows: list[dict[str, Any]] = []
    pv = 0.0
    terminal = 0.0
    e = egi
    for k in range(1, years + 2):
        if k > 1:
            e = e * (1 + (g1 if k <= sw else (g2 if k <= years else 0)))
        x = exp_raw * mult * js_pow(1 + n(d.get("expGrowth")) / 100, k - 1) + pct_cost(e)
        cf = e - x - dep_in
        if k <= years:
            pvk = js_div(cf, js_pow(1 + y, k))
            pv += pvk
            flows.append({"k": k, "egi": e, "exp": x, "dep": dep_in, "cf": cf, "pv": pvk})
        elif n(d.get("termCap")) > 0:
            terminal = js_div(cf, n(d.get("termCap")) / 100) * (1 - n(d.get("sellCost")) / 100)
        else:
            terminal = 0.0
    tpv = js_div(terminal, js_pow(1 + y, years))
    return pv + tpv, flows, {"value": terminal, "pv": tpv, "pvFlows": pv}


def income_calc(
    inc: dict[str, Any], area: float, t: float, s: dict[str, Any], exp_mult: Any
) -> dict[str, Any]:
    """收益法主計算（對應 incomeCalc）；t 為成本法總成本，供建物折舊使用。"""
    hotel = inc.get("revMode") == "hotel"
    rent = n(inc.get("rent"))
    other = js_sum(inc["incomes"], lambda x: x.get("amt"))
    other_pct = n(inc.get("otherPct"))
    room_rev = (
        n(inc.get("rooms")) * n(inc.get("adr")) * 365 * n(inc.get("occ")) / 100 if hotel else 0
    )
    gross = room_rev * (1 + other_pct / 100) + other if hotel else rent * 12 + other
    loss = 0 if hotel else rent * n(inc.get("vacMonths"))
    egi = gross - loss
    exp_raw = js_sum(inc["exp"], lambda x: x.get("amt"))
    mult = 1.0 if exp_mult is None else n(exp_mult)

    def pct_cost(e: float) -> float:
        base = e / (1 + other_pct / 100) if hotel else e
        return base * n(inc.get("opexPct")) / 100 + e * n(inc.get("mgmtPct")) / 100

    exp_sum = exp_raw * mult + pct_cost(egi)
    build_cost = n(inc.get("manualCost")) if inc.get("costSource") == "manual" else t
    life = n(inc.get("life"))
    dep = build_cost * (1 - n(inc.get("salvage")) / 100) / life if life > 0 else 0.0
    noi = egi - exp_sum - dep
    cap = cap_rate(inc)
    price: float | None
    flows = None
    terminal = None
    if inc.get("method") == "dcf":
        price, flows, terminal = _dcf(inc, egi, exp_raw, mult, dep, pct_cost)
    else:
        price = js_div(noi, cap / 100) if cap > 0 else None
    unit_raw = price / area / 10000 if price is not None and area > 0 else None
    return {
        "hotel": hotel, "roomRev": room_rev, "rent": rent, "other": other, "gross": gross,
        "loss": loss,
        "egi": egi, "expSum": exp_sum, "expRaw": exp_raw, "expMult": mult, "pctPart": pct_cost(egi),
        "buildCost": build_cost, "dep": dep, "noi": noi, "cap": cap, "price": price, "flows": flows,
        "terminal": terminal, "unitRaw": unit_raw,
        "unit": None if unit_raw is None else round_to(unit_raw, n(s.get("unitDec"))),
    }  # fmt: skip
