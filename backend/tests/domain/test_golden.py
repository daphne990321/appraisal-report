"""golden 情境：載入檢查，以及（calculate 完成後）逐情境比對。"""

from datetime import date

import pytest

from appraisal.domain.calc import calculate
from appraisal.domain.calc.reference import filtered_sales, market_stats, reference_from_db
from tests.domain.golden import Scenario, load_db, load_scenarios, resolve_model
from tests.domain.golden_compare import compare_golden

SCENARIOS = load_scenarios()
REF = reference_from_db(load_db())
TODAY = date(2026, 11, 13)


def test_loader_finds_all_scenarios() -> None:
    assert len(SCENARIOS) == 31
    assert len({s.name for s in SCENARIOS}) == 31


def test_every_scenario_resolves_a_model() -> None:
    for s in SCENARIOS:
        assert s.model["id"] == s.model_id, s.name
        assert "settings" in s.model, s.name


def test_inline_model_wins_over_model_id() -> None:
    db = load_db()
    inline = {"id": "m1", "settings": {"x": 1}}
    assert resolve_model({"modelId": "m1", "model": inline}, db) == inline
    assert resolve_model({"modelId": "m2"}, db)["id"] == "m2"


def test_unknown_model_id_raises() -> None:
    with pytest.raises(KeyError):
        resolve_model({"modelId": "nope"}, load_db())


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_golden_scenario(scenario: Scenario) -> None:
    case, model, expected = scenario.case, scenario.model, scenario.expected
    assert compare_golden(expected["calc"], calculate(case, model, REF, TODAY)) == []
    sales = filtered_sales(case, model, REF, TODAY)
    assert [x["id"] for x in sales] == expected["sales"]
    assert compare_golden(expected["marketStats"], market_stats(case, model, REF, TODAY)) == []
