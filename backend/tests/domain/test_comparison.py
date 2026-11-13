"""比較法與計量模型：對每個 golden 情境，結果要和舊版輸出一致。"""

from datetime import date
from typing import Any

import pytest

from appraisal.domain.calc.comparison import comp_calc, date_adj_of, deviation_weights
from appraisal.domain.calc.library import reference_from_db
from appraisal.domain.calc.modelview import (
    exp_of,
    find_model,
    inds_of,
    model_of,
    model_weights,
    purpose_rule,
)
from appraisal.domain.calc.ols import ols
from appraisal.domain.calc.reference import area_of
from appraisal.domain.calc.regression import regression
from appraisal.domain.constants import is_land_kind
from appraisal.domain.jsnum import n
from tests.domain.golden import Scenario, load_db, load_scenarios
from tests.domain.golden_compare import compare_golden

SCENARIOS = load_scenarios()
REF = reference_from_db(load_db())
TODAY = date(2026, 11, 13)


def run_comp(c: dict[str, Any], model: dict[str, Any]) -> dict[str, Any]:
    """用舊版 calc() 傳給 compCalc 的相同參數呼叫。"""
    land = is_land_kind(c.get("kind"))
    opt = {
        "volumeBasis": land and c["comp"].get("volumeBasis"),
        "subjFar": n(c["comp"].get("subjFar")) or n(c["land"].get("far")),
    }
    return comp_calc(
        c["comps"],
        inds_of(model, c),
        model["settings"],
        c["basic"].get("priceDate"),
        "diff" if c["comp"].get("method") == "diff" else "pct",
        c["comp"].get("inputMode"),
        exp_of(model, c),
        c.get("subjFlags") or {},
        opt,
    )


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_comp_calc_matches_legacy(scenario: Scenario) -> None:
    c = scenario.case
    if c["comp"].get("method") == "reg":
        pytest.skip("regression scenario, covered by test_regression_matches_legacy")
    diffs = compare_golden(scenario.expected["calc"]["comp"], run_comp(c, scenario.model))
    assert diffs == []


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_regression_matches_legacy(scenario: Scenario) -> None:
    c = scenario.case
    if c["comp"].get("method") != "reg":
        pytest.skip("not a regression scenario")
    actual = regression(c, scenario.model, REF, TODAY)
    assert compare_golden(scenario.expected["calc"]["reg"], actual) == []
    assert area_of(c) == scenario.expected["calc"]["area"]


def test_golden_covers_diff_and_regression_branches() -> None:
    methods = {s.case["comp"].get("method") for s in SCENARIOS}
    assert {"diff", "reg"} <= methods
    modes = {s.model["settings"].get("weightMode") for s in SCENARIOS}
    assert {"deviation", "inverse"} <= modes


def test_deviation_weights_sum_to_100() -> None:
    w = deviation_weights([10.0, 20.0, 30.0])
    assert sum(w) == 100
    assert deviation_weights([0.0, 0.0, 0.0, 0.0]) == [25.0, 25.0, 25.0, 25.0]


def test_date_adj_auto_and_manual() -> None:
    s = {"dateMode": "auto", "monthlyRate": 0.5}
    assert date_adj_of({"date": "2026-01"}, s, "2026-04-01") == 1.5
    assert (
        date_adj_of({"date": "2026-01", "dateManual": True, "dateAdj": "2"}, s, "2026-04-01") == 2
    )
    assert date_adj_of({"date": "2026-01", "dateAdj": 3}, {"dateMode": "manual"}, "2026-04-01") == 3


def test_ols_known_slope_and_singular_matrix() -> None:
    fit = ols([[1.0, 1.0], [1.0, 2.0], [1.0, 3.0], [1.0, 4.0]], [3.0, 5.0, 7.0, 9.5])
    assert fit is not None
    assert fit["beta"][1] == pytest.approx(2.15, abs=1e-9)
    assert 0 <= fit["p"] <= 1
    assert ols([[1.0, 2.0], [1.0, 2.0], [1.0, 2.0]], [1.0, 2.0, 3.0]) is None
    assert ols([[1.0, 1.0], [1.0, 2.0]], [1.0, 2.0]) is None


def test_regression_error_messages() -> None:
    sc = next(s for s in SCENARIOS if s.case["comp"].get("method") == "reg")
    c = {**sc.case, "comp": {**sc.case["comp"], "regVars": []}}
    assert regression(c, sc.model, REF, TODAY) == {"err": "請至少選一個自變數"}
    many = {**sc.case["comp"], "regVars": ["age", "floor", "area", "months", "totalFloors"] * 40}
    out = regression({**sc.case, "comp": many}, sc.model, REF, TODAY)
    assert out["err"] == "樣本數不足"


def test_model_view_helpers() -> None:
    sc = SCENARIOS[0]
    models = load_db()["models"]
    assert find_model(models, "m2")["id"] == "m2"
    assert find_model(models, "none")["id"] == models[0]["id"]
    snap = {"id": "snap"}
    assert model_of(models, {"signed": True, "modelSnapshot": snap, "modelId": "m2"}) is snap
    assert model_of(models, {"signed": False, "modelSnapshot": snap, "modelId": "m2"})["id"] == "m2"
    default = purpose_rule({"basic": {"purpose": "x"}}, {})
    assert default["w"]["comparison"] == 80
    assert model_weights({"kind": "zzz"}, {}, {"w": "P"}) == "P"
    assert inds_of(sc.model, sc.case) == [x for x in inds_of(sc.model, sc.case) if x["on"]]
