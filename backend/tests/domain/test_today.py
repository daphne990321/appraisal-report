"""today 參數：價格日期空白時依 today 改變；有價格日期時不受 today 影響。"""

import copy
from datetime import date

from appraisal.domain.calc import calculate
from appraisal.domain.calc.reference import filtered_sales, reference_from_db, subj
from tests.domain.golden import load_db, load_scenarios

SCENARIOS = load_scenarios()
REF = reference_from_db(load_db())
T1 = date(2026, 11, 13)
T2 = date(2027, 5, 13)


def _scenario_with_sales() -> object:
    for s in SCENARIOS:
        if s.expected["sales"] and s.case["kind"] not in ("land", "industrial"):
            return s
    raise AssertionError("no scenario with sales")


def test_price_date_set_ignores_today() -> None:
    for s in SCENARIOS:
        assert s.case["basic"].get("priceDate"), s.name
        a = calculate(s.case, s.model, REF, T1)
        b = calculate(s.case, s.model, REF, T2)
        assert a == b, s.name


def test_blank_price_date_depends_on_today() -> None:
    s = _scenario_with_sales()
    case = copy.deepcopy(s.case)  # type: ignore[attr-defined]
    case["basic"]["priceDate"] = ""
    case["comp"]["method"] = "reg"  # 只有計量模型會用 today 篩選實價登錄
    case["comp"]["regVars"] = ["area", "months"]
    model = s.model  # type: ignore[attr-defined]
    assert subj(case, T1)["age"] != subj(case, T2)["age"] or case["basic"].get("completed") == ""
    ids1 = [x["id"] for x in filtered_sales(case, model, REF, T1)]
    ids2 = [x["id"] for x in filtered_sales(case, model, REF, T2)]
    assert ids1 != ids2
    assert calculate(case, model, REF, T1) != calculate(case, model, REF, T2)
