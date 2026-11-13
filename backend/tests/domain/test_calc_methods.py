"""收益法、成本法、土地開發分析、地號與中文金額：逐情境比對 golden，並補單元測試。"""

from typing import Any

import pytest

from appraisal.domain.calc._js import js_div, js_pow
from appraisal.domain.calc.cnamount import cn_amount
from appraisal.domain.calc.cost import cost_calc
from appraisal.domain.calc.income import income_calc, loan_constant
from appraisal.domain.calc.land import land_calc
from appraisal.domain.calc.parcels import land_vat, parcels_calc
from appraisal.domain.jsnum import n, round_to
from tests.domain.golden import Scenario, load_scenarios
from tests.domain.golden_compare import compare_golden

SCENARIOS = load_scenarios()


def _cost(c: dict[str, Any], exp: dict[str, Any]) -> dict[str, Any]:
    b = c["basic"]
    s = exp["S"]
    cost = cost_calc(c["cost"], n(b["area"]), n(b["landShare"]), b["completed"], b["priceDate"], s)
    if cost["unitRaw"] is not None and n(b["area"]) > 0:
        cost["unitRaw"] = cost["price"] / n(b["area"]) / 10000
        cost["unit"] = round_to(cost["unitRaw"], n(s["unitDec"]))
    return dict(cost)


def _land_input(c: dict[str, Any], exp: dict[str, Any]) -> dict[str, Any]:
    ld: dict[str, Any] = c["land"]
    if exp["isLand"] and ld.get("mode") == "detailed" and not n(ld.get("site")) > 0:
        ld = {**ld, "site": exp["area"]}
    return ld


@pytest.mark.parametrize("sc", SCENARIOS, ids=lambda s: s.name)
def test_cost_matches_golden(sc: Scenario) -> None:
    exp = sc.expected["calc"]
    assert compare_golden(exp["cost"], _cost(sc.case, exp), "$.cost") == []


@pytest.mark.parametrize("sc", SCENARIOS, ids=lambda s: s.name)
def test_income_matches_golden(sc: Scenario) -> None:
    exp = sc.expected["calc"]
    cost = _cost(sc.case, exp)
    inc = income_calc(
        sc.case["income"], n(sc.case["basic"]["area"]), cost["T"], exp["S"], exp["P"].get("expMult")
    )
    assert compare_golden(exp["inc"], inc, "$.inc") == []


@pytest.mark.parametrize("sc", SCENARIOS, ids=lambda s: s.name)
def test_land_matches_golden(sc: Scenario) -> None:
    exp = sc.expected["calc"]
    land = land_calc(_land_input(sc.case, exp), exp["area"], exp["S"])
    assert compare_golden(exp["land"], land, "$.land") == []


@pytest.mark.parametrize("sc", SCENARIOS, ids=lambda s: s.name)
def test_parcels_matches_golden(sc: Scenario) -> None:
    exp = sc.expected["calc"]
    if exp["parcels"] is None:
        pytest.skip("scenario has no parcels")
    # 舊版在 finalCalc 後才呼叫 parcelsCalc，fin.unit 之後沒有被改動（只改 totalWan、yuan）
    base = exp["fin"]["unit"] if exp["isLand"] else None
    parcels = parcels_calc(sc.case.get("parcels"), base, exp["S"])
    assert compare_golden(exp["parcels"], parcels, "$.parcels") == []


def test_golden_covers_each_branch() -> None:
    inc = [s.expected["calc"]["inc"] for s in SCENARIOS]
    assert any(i["flows"] is not None for i in inc)
    assert {s.case["income"].get("capMode") for s in SCENARIOS} >= {"risk", "wacc", "dcr", "egim"}
    assert {s.case["cost"].get("depMethod") for s in SCENARIOS} >= {"declining", "sinking"}
    assert any(s.expected["calc"]["cost"]["depNote"] for s in SCENARIOS)
    assert {s.case["land"].get("iMode") for s in SCENARIOS} >= {"input", "formula"}


def test_cn_amount_values() -> None:
    cases = {
        0: "零元整", 1: "壹元整", 10: "壹拾元整", 101: "壹佰零壹元整", 1001: "壹仟零壹元整",
        10000: "壹萬元整", 10001: "壹萬零壹元整", 100000: "壹拾萬元整",
        12345: "壹萬貳仟參佰肆拾伍元整",
        120045: "壹拾貳萬零肆拾伍元整", 100010000: "壹億零壹萬元整", 0.5: "壹元整", 2.5: "參元整",
        -3: "零元整", float("nan"): "零元整",
        1234567890123: "壹兆貳仟參佰肆拾伍億陸仟柒佰捌拾玖萬零壹佰貳拾參元整",
    }  # fmt: skip
    for value, text in cases.items():
        assert cn_amount(value) == text, value


def test_cn_amount_beyond_zhao_keeps_legacy_undefined() -> None:
    assert cn_amount(1e16) == "壹undefined元整"


def test_loan_constant_edges() -> None:
    assert loan_constant(2, 0) == 0
    assert loan_constant(0, 20) == 1 / 20
    assert loan_constant(2, 20) == pytest.approx(0.0611567, abs=1e-6)


def test_land_vat_brackets() -> None:
    base = {"areaM2": 100, "prevVal": 1000, "cpi": 100}
    assert land_vat({**base, "annVal": 1000})["tax"] == 0
    assert land_vat({**base, "annVal": 1500})["tax"] == 10000  # 增值倍數 0.5，稅率 20%
    assert land_vat({**base, "annVal": 2500})["tax"] == 35000  # 增值倍數 1.5
    assert land_vat({**base, "annVal": 3000})["tax"] == 50000  # 增值倍數 2


def test_js_div_and_pow_do_not_raise() -> None:
    assert js_div(1, 0) == float("inf")
    assert js_div(-1, 0) == float("-inf")
    assert js_div(0, 0) != js_div(0, 0)
    assert js_pow(0, -1) == float("inf")
    assert js_pow(-8, 1 / 3) != js_pow(-8, 1 / 3)
