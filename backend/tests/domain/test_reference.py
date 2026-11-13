"""參考資料篩選、市場行情與預篩條件：和舊版輸出一致，且預篩不比完整規則嚴格。"""

import math
import re
from datetime import date
from typing import Any

import pytest

from appraisal.domain.calc.library import ReferenceData, lvr_row_to_record, merge_lib
from appraisal.domain.calc.reference import (
    all_sales,
    filtered_rents,
    filtered_sales,
    is_whole,
    market_stats,
    pd_of,
    prefilter,
    quantile,
    reference_from_db,
    zone_class,
)
from tests.domain.golden import Scenario, load_db, load_scenarios
from tests.domain.golden_compare import compare_golden

SCENARIOS = load_scenarios()
DB = load_db()
REF = reference_from_db(DB)
TODAY = date(2026, 11, 13)


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_filtered_sales_ids_and_order(scenario: Scenario) -> None:
    rows = filtered_sales(scenario.case, scenario.model, REF, TODAY)
    assert [x["id"] for x in rows] == scenario.expected["sales"]


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_market_stats_matches_legacy(scenario: Scenario) -> None:
    actual = market_stats(scenario.case, scenario.model, REF, TODAY)
    assert compare_golden(scenario.expected["marketStats"], actual) == []


def _passes(x: dict[str, Any], pf: Any) -> bool:
    """用預篩條件判斷一筆資料會不會被 SQL 取出。"""
    if (x.get("kind") == "landsale") != pf.landsale:
        return False
    if pf.county and x.get("county") != pf.county:
        return False
    if pf.district and x.get("district") != pf.district:
        return False
    d = x.get("date", "")
    if not re.fullmatch(r"\d{4}-\d{2}", d):
        return bool(pf.include_undated)
    after_from = pf.date_from is None or d >= pf.date_from
    before_to = pf.date_to is None or d <= pf.date_to
    return bool(after_from and before_to)


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_prefilter_never_stricter_than_full_rules(scenario: Scenario) -> None:
    pf = prefilter(scenario.case, scenario.model, TODAY)
    for x in filtered_sales(scenario.case, scenario.model, REF, TODAY):
        assert _passes(x, pf), (scenario.name, x["id"])


def test_prefilter_builds_conditions_from_rules() -> None:
    sc = SCENARIOS[0]
    model = {**sc.model, "select": {**sc.model["select"], "sameCounty": True, "months": 6}}
    case = {**sc.case, "basic": {**sc.case["basic"], "priceDate": "2026-04-12", "county": "新竹縣"}}
    pf = prefilter(case, model, TODAY)
    assert (pf.county, pf.date_from, pf.date_to) == ("新竹縣", "2025-10", "2026-04")
    loose = {**model, "select": {**model["select"], "sameCounty": False, "sameDistrict": False}}
    assert prefilter(case, loose, TODAY).county is None
    unbounded = {**loose, "select": {**loose["select"], "months": "abc"}}
    assert prefilter(case, unbounded, TODAY).date_from is None


def test_pd_of_uses_today_only_when_price_date_is_empty() -> None:
    assert pd_of({"basic": {"priceDate": ""}}, date(2027, 1, 5)) == "2027-01-05"
    assert pd_of({"basic": {}}, date(2027, 1, 5)) == "2027-01-05"
    assert pd_of({"basic": {"priceDate": "2026-04-12"}}, date(2027, 1, 5)) == "2026-04-12"


def test_filtered_sales_depends_on_today_when_price_date_is_empty() -> None:
    sc = SCENARIOS[0]
    case = {**sc.case, "basic": {**sc.case["basic"], "priceDate": ""}}
    near = [x["id"] for x in filtered_sales(case, sc.model, REF, date(2026, 10, 1))]
    far = [x["id"] for x in filtered_sales(case, sc.model, REF, date(2030, 1, 1))]
    assert far == []
    assert near != far
    fixed = [x["id"] for x in filtered_sales(sc.case, sc.model, REF, date(2030, 1, 1))]
    assert fixed == sc.expected["sales"]


def test_filtered_rents_sorted_newest_first_and_whole_lease() -> None:
    sc = SCENARIOS[0]
    rows = filtered_rents(sc.case, sc.model, REF, TODAY)
    dates = [x["date"] for x in rows]
    assert dates == sorted(dates, reverse=True)
    assert is_whole({}) and is_whole({"lease": "整棟(戶)出租"})
    assert not is_whole({"lease": "獨立套房"})


def test_all_sales_follows_model_sources() -> None:
    only_own = all_sales(REF, {"sources": {"lvr": False, "own": True}})
    assert only_own == REF.own
    assert all_sales(REF, {}) == REF.sales + REF.own


def test_library_hide_builtin_and_cloud_merge() -> None:
    b = [{"id": "b1", "county": "A", "serial": "s1"}, {"id": "b2", "county": "B"}]
    imp = [{"id": "i1", "serial": "s1"}]
    ref = ReferenceData.from_parts(b, [], imp, [], [], hide_builtin=True)
    assert [x["id"] for x in ref.sales] == ["i1"]
    cloud = {"sales": [{"id": "c1", "serial": "s1"}], "rents": [], "counties": ["B"]}
    ref = ReferenceData.from_parts(b, [], imp, [], [], cloud=cloud)
    assert [x["id"] for x in ref.sales] == ["c1"]
    assert [x["id"] for x in merge_lib([[{"id": 1}], [{"id": 2}]])] == [1, 2]


def test_lvr_row_to_record_defaults() -> None:
    row = {"serial": "S1", "kind": "sale", "ym": "2026-01", "unit_wan": 12.5, "age": None}
    rec = lvr_row_to_record(row)
    assert rec["id"] == "LS1" and rec["age"] == "" and rec["elevator"] is False
    rent = lvr_row_to_record({"serial": "R1", "kind": "rent", "rent_per_ping": 500})
    assert rent["rentPerPing"] == 500 and "unitWan" not in rent


def test_quantile_and_zone_class() -> None:
    assert quantile([], 0.5) is None
    assert quantile([1.0, 2.0, 3.0, 4.0], 0.5) == 2.5
    zones = ("第二種住宅區", "商業區", "乙種工業區", "農牧", "風景", "-", None)
    assert [zone_class(z) for z in zones] == ["住", "商", "工", "農", "其他", "", ""]


def _first_scenario_with_sales() -> Scenario:
    return next(s for s in SCENARIOS if s.expected["sales"] and s.case["kind"] != "land")


def test_missing_threshold_skips_exclusion_like_js_nan() -> None:
    """舊版 Number(undefined) 為 NaN，比較為假、不排除；不是當成 0 排除。"""
    s = _first_scenario_with_sales()
    model = {**s.model, "select": {k: v for k, v in s.model["select"].items() if k != "months"}}
    rows = filtered_sales(s.case, model, REF, TODAY)
    assert len(rows) >= len(s.expected["sales"])
    zero = {**s.model, "select": {**s.model["select"], "months": 0}}
    assert len(filtered_sales(s.case, zero, REF, TODAY)) < len(rows)
    blank = {**s.model, "select": {**s.model["select"], "months": ""}}
    assert filtered_sales(s.case, blank, REF, TODAY) == filtered_sales(s.case, zero, REF, TODAY)


def test_missing_rent_threshold_skips_exclusion() -> None:
    s = _first_scenario_with_sales()
    sel = {k: v for k, v in s.model["rentSelect"].items() if k not in ("months", "areaTolPct")}
    full = filtered_rents(s.case, {**s.model, "rentSelect": sel}, REF, TODAY)
    zero = {**s.model["rentSelect"], "months": 0}
    assert len(full) >= len(filtered_rents(s.case, {**s.model, "rentSelect": zero}, REF, TODAY))


def test_score_of_nan_propagation() -> None:
    from appraisal.domain.calc.reference import score_of, subj

    s = _first_scenario_with_sales()
    sv = subj(s.case, TODAY)
    x = {"date": "2026-01", "age": 5, "areaPing": 30, "unitWan": 1}
    r = dict(s.model["select"])
    assert score_of(x, s.case, r, "2026-11-13", sv) == score_of(x, s.case, {**r}, "2026-11-13", sv)
    del r["wDate"]
    assert math.isnan(score_of(x, s.case, r, "2026-11-13", sv))
    ok = {**s.model["select"], "ageTol": 10}
    assert not math.isnan(score_of(x, s.case, ok, "2026-11-13", sv))
    no_age_tol = {k: v for k, v in ok.items() if k != "ageTol"}
    assert math.isnan(score_of({**x, "age": ""}, s.case, no_age_tol, "2026-11-13", sv))
    assert not math.isnan(score_of(x, s.case, no_age_tol, "2026-11-13", sv))
