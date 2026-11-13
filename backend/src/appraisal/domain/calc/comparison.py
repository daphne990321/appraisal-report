"""比較法：百分率法與差額法（對應舊版 core/calc.js 的 compCalc 與其輔助函式）。"""

from typing import Any

from appraisal.domain.calc._js import js_div, js_sum, truthy
from appraisal.domain.dates import months_between
from appraisal.domain.jsnum import js_round, n, r2, round_to


def cell_val(c: dict[str, Any], ind: dict[str, Any], mode: str, input_mode: Any) -> float:
    """某比較標的在某項指標的調整值：差額法為金額，百分率法為百分比。"""
    a = (c.get("adj") or {}).get(ind["id"]) or {}
    if mode == "diff":
        return n(a.get("lv")) * n(ind.get("stepAmt")) if input_mode == "grade" else n(a.get("amt"))
    return n(a.get("lv")) * n(ind.get("step")) if input_mode == "grade" else n(a.get("pct"))


def date_adj_of(c: dict[str, Any], s: dict[str, Any], price_date: Any) -> float:
    """價格日期調整率（%）：自動模式依月數乘月調整率，否則用手填值。"""
    if s.get("dateMode") == "auto" and not truthy(c.get("dateManual")):
        return r2(months_between(c.get("date"), price_date) * n(s.get("monthlyRate")))
    return n(c.get("dateAdj"))


def deviation_weights(sums: list[float]) -> list[float]:
    """差異百分率偏離率權重：w = (2 − 差異絕對值加總 ÷ 平均) ÷ 件數。"""
    m = js_sum(sums) / len(sums) if sums else 0.0
    if not m > 0:
        return [js_round(1000 / len(sums)) / 10 for _ in sums]
    raw = [max(0.0, 2 - x / m) for x in sums]
    t = js_sum(raw) or 1.0
    w = [js_round(x / t * 100) for x in raw]
    d = 100 - js_sum(w)
    if d and w:
        w[w.index(max(w))] += d
    return w


def _items(
    c: dict[str, Any], inds: list[dict[str, Any]], base: float, mode: str, input_mode: Any
) -> list[dict[str, Any]]:
    items = []
    for ind in inds:
        v = cell_val(c, ind, mode, input_mode)
        pct = (v / base * 100 if base > 0 else 0.0) if mode == "diff" else v
        items.append({"id": ind["id"], "group": ind.get("group"), "v": v, "pct": pct})
    return items


def _exp_items(
    c: dict[str, Any],
    exp_rows: list[dict[str, Any]],
    subj_flags: dict[str, Any],
    base: float,
    mode: str,
) -> list[dict[str, Any]]:
    items = []
    flags = c.get("flags")
    for e in exp_rows:
        subject_part = n(e.get("pct")) if truthy(subj_flags.get(e["id"])) else 0.0
        comp_part = n(e.get("pct")) if flags and truthy(flags.get(e["id"])) else 0.0
        d = subject_part - comp_part
        v = r2(base * d / 100) if mode == "diff" else d
        items.append({"id": "x:" + e["id"], "group": e.get("group"), "v": v, "pct": d, "exp": True})
    return items


def _group_sums(items: list[dict[str, Any]]) -> tuple[float, float, float, float, float]:
    """區域因素與個別因素各自的調整率合計、金額合計，以及單項調整率的最大絕對值。"""
    r = i = rv = iv = max_item = 0.0
    for it in items:
        if it["group"] == "region":
            r += it["pct"]
            rv += it["v"]
        else:
            i += it["pct"]
            iv += it["v"]
        max_item = max(max_item, abs(it["pct"]))
    return r, i, rv, iv, max_item


def _is_usable(c: dict[str, Any], violated: bool, special_unadjusted: bool) -> bool:
    """比較標的能不能採用：有納入、沒超限（或有例外說明）、不是未調整的特殊交易、有價格。"""
    return bool(
        c.get("include") is not False
        and (not violated or truthy(c.get("exception")))
        and not special_unadjusted
        and n(c.get("price")) > 0
    )


def _price_basis(
    c: dict[str, Any], cond: float, date: float, opt: dict[str, Any]
) -> tuple[float, float, float, float | None, float]:
    """議價後單價、容積率換算比與價格日期、交易情況調整後的基準單價。"""
    bargain = n(c.get("bargain")) if c.get("priceType") == "ask" else 0.0
    p_eff = n(c.get("price")) * (1 - bargain / 100)
    far = n(c.get("far"))
    subj_far = n(opt.get("subjFar"))
    vol_basis = truthy(opt.get("volumeBasis"))
    vol_ratio = subj_far / far if vol_basis and far > 0 and subj_far > 0 else 1.0
    vol_price = p_eff / (far / 100) if vol_basis and far > 0 else None
    base = p_eff * (1 + cond / 100) * (1 + date / 100)
    return bargain, p_eff, vol_ratio, vol_price, base


def _comp_row(
    c: dict[str, Any],
    inds: list[dict[str, Any]],
    s: dict[str, Any],
    price_date: Any,
    mode: str,
    input_mode: Any,
    exp_rows: list[dict[str, Any]],
    subj_flags: dict[str, Any],
    opt: dict[str, Any],
) -> dict[str, Any]:
    cond = n(c.get("cond"))
    date = date_adj_of(c, s, price_date)
    bargain, p_eff, vol_ratio, vol_price, base = _price_basis(c, cond, date, opt)
    items = _items(c, inds, base, mode, input_mode) + _exp_items(
        c, exp_rows, subj_flags, base, mode
    )
    r, i, rv, iv, max_item = _group_sums(items)
    if mode == "diff":
        trial = r2((base + rv + iv) * vol_ratio)
        factor = (base + rv + iv) / p_eff if p_eff > 0 else 1.0
    else:
        r = r2(r)
        i = r2(i)
        factor = (1 + cond / 100) * (1 + date / 100) * (1 + r / 100) * (1 + i / 100)
        trial = r2(p_eff * factor * vol_ratio)
    abs_sum = abs(cond) + abs(date)
    acc = 0.0
    for it in items:
        acc += abs(it["pct"])
    abs_sum += acc
    if s.get("totalMode") == "compound":
        total = abs(factor - 1) * 100
    else:
        total = abs(cond) + abs(date) + abs(r) + abs(i)
    viol15 = (
        abs(r) > n(s.get("lim15")) or abs(i) > n(s.get("lim15")) or max_item > n(s.get("lim15"))
    )
    viol30 = total > n(s.get("lim30"))
    special_unadjusted = truthy(c.get("special")) and cond == 0
    usable = _is_usable(c, viol15 or viol30, special_unadjusted)
    return {
        "items": items, "r": r, "i": i, "rv": rv, "iv": iv, "cond": cond, "date": date,
        "maxItem": max_item, "total": total, "viol15": viol15, "viol30": viol30, "trial": trial,
        "usable": usable, "specialUnadjusted": special_unadjusted, "weight": n(c.get("weight")),
        "pEff": p_eff, "bargain": bargain, "volRatio": vol_ratio, "volPrice": vol_price,
        "factor": factor, "absSum": abs_sum,
    }  # fmt: skip


def _auto_weights(rows: list[dict[str, Any]], used: list[dict[str, Any]], mode: Any) -> None:
    """deviation 或 inverse 權重模式：用的標的重算權重，不用的歸零。"""
    if mode == "deviation" and used:
        w = deviation_weights([x["absSum"] for x in used])
        for k, x in enumerate(used):
            x["weight"] = w[k]
    elif mode == "inverse" and used:
        inv = [1 / (1 + x["total"]) for x in used]
        s = js_sum(inv)
        for k, x in enumerate(used):
            x["weight"] = js_round(inv[k] / s * 1000) / 10
    else:
        return
    for x in rows:
        if not x["usable"]:
            x["weight"] = 0


def comp_calc(
    comps: list[dict[str, Any]],
    inds: list[dict[str, Any]],
    s: dict[str, Any],
    price_date: Any,
    mode: str,
    input_mode: Any,
    exp_rows: list[dict[str, Any]] | None,
    subj_flags: dict[str, Any] | None,
    opt: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """比較法計算：每個比較標的的調整、試算單價與權重，再加權平均成比較價格。"""
    rows = [
        _comp_row(
            c, inds, s, price_date, mode, input_mode, exp_rows or [], subj_flags or {}, opt or {}
        )
        for c in comps
    ]
    used = [x for x in rows if x["usable"]]
    _auto_weights(rows, used, s.get("weightMode"))
    trials = [x["trial"] for x in used]
    hi = max(trials) if trials else 0.0
    lo = min(trials) if trials else 0.0
    gap = js_div((hi - lo), (hi + lo) / 2) * 100 if len(trials) >= 2 else 0.0
    w_sum = js_sum(used, lambda x: x["weight"])
    unit_raw = js_sum(used, lambda x: x["trial"] * x["weight"]) / w_sum if w_sum > 0 else None
    return {
        "rows": rows,
        "usedCount": len(used),
        "gap": gap,
        "wSum": w_sum,
        "unitRaw": unit_raw,
        "unit": None if unit_raw is None else round_to(unit_raw, n(s.get("unitDec"))),
    }
