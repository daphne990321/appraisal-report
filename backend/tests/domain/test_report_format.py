"""報告格式選擇、報告脈絡（report_context）與摘要式題庫的讀取規則。"""

import copy
from datetime import date
from typing import Any

import pytest

from appraisal.domain.calc import calculate
from appraisal.domain.calc.reference import reference_from_db
from appraisal.domain.constants import CAPNAMES
from appraisal.domain.report import report_context, report_format
from appraisal.domain.report.survey import (
    SURVEY,
    chk_get,
    chk_of,
    chk_shown,
    survey_disclosures,
    survey_groups,
)
from appraisal.domain.validate.seltext import sel_text
from tests.domain.golden import Scenario, load_db, load_scenarios

SCENARIOS = {s.name: s for s in load_scenarios()}
REF = reference_from_db(load_db())
TODAY = date(2026, 11, 13)


def case_of(name: str) -> dict[str, Any]:
    return copy.deepcopy(SCENARIOS[name].case)


def mortgage_unit() -> dict[str, Any]:
    case = case_of("base-115-0412-m1")
    case["basic"]["purpose"] = "抵押權設定"
    return case


def test_user_choice_wins_over_auto() -> None:
    case = mortgage_unit()
    case["report"] = {"format": "narrative"}
    assert report_format(case) == "narrative"
    case = case_of("base-115-0412-m1")
    case["report"] = {"format": "summary"}
    assert report_format(case) == "summary"


def test_auto_picks_summary_for_mortgage_residential() -> None:
    case = mortgage_unit()
    assert report_format(case) == "summary"
    case["report"] = {"format": "auto"}
    assert report_format(case) == "summary"
    case["kind"] = "house"
    assert report_format(case) == "summary"


def test_auto_picks_narrative_for_other_cases() -> None:
    assert report_format(case_of("base-115-0412-m1")) == "narrative"
    case = mortgage_unit()
    case["kind"] = "land"
    assert report_format(case) == "narrative"
    case = mortgage_unit()
    case["chk"] = {"luxury": True}
    assert report_format(case) == "narrative"


def test_chk_get_does_not_change_case_but_chk_of_creates_it() -> None:
    case = case_of("base-115-0412-m1")
    case.pop("chk", None)
    assert chk_get(case) == {}
    assert "chk" not in case
    chk_of(case)["entered"] = "已入內"
    assert case["chk"] == {"entered": "已入內"}


def test_chk_shown_conditions() -> None:
    case: dict[str, Any] = {"chk": {"ext": "有", "nuis": ["無"], "supply": ["供過於求"]}}
    assert chk_shown(case, {"k": "x"})
    assert chk_shown(case, {"show": {"k": "ext", "v": "有"}})
    assert not chk_shown(case, {"show": {"k": "ext", "v": "無"}})
    assert chk_shown(case, {"show": {"k": "supply", "v": ["供過於求", "供不應求"]}})
    assert not chk_shown(case, {"show": {"k": "nuis", "not": ["無"]}})
    case["chk"]["nuis"] = ["無", "死巷"]
    assert chk_shown(case, {"show": {"k": "nuis", "not": ["無"]}})
    case["chk"]["nuis"] = []
    assert not chk_shown(case, {"show": {"k": "nuis", "not": ["無"]}})


def test_survey_groups_hide_building_groups_for_land() -> None:
    land = {"kind": "land"}
    unit = {"kind": "unit"}
    assert all(g.get("land") for g in survey_groups(land, "survey"))
    assert len(survey_groups(unit, "survey")) > len(survey_groups(land, "survey"))
    assert {g["id"] for g in SURVEY} >= {"title", "use", "area", "market", "reflect"}


def test_disclosure_only_when_inside_not_entered() -> None:
    assert survey_disclosures({"chk": {"entered": "已入內"}}) == []
    text = "本次因故未能進入勘估標的內部勘察。"
    assert survey_disclosures({"chk": {"entered": "未能入內"}}) == [text]
    with_photo = survey_disclosures({"chk": {"entered": "未能入內", "photoByClient": True}})
    assert with_photo == ["本次因故未能進入勘估標的內部勘察，內部照片係由委託人提供。"]


def context_for(name: str) -> tuple[dict[str, Any], Scenario]:
    s = SCENARIOS[name]
    calc = calculate(s.case, s.model, REF, TODAY)
    return report_context(s.case, calc, s.model, REF, TODAY), s


def test_context_has_select_text_for_comparison_methods() -> None:
    ctx, s = context_for("base-115-0412-m1")
    assert ctx["selText"] == sel_text(s.model)
    assert ctx["selText"] != ""
    assert set(ctx) == {"kind", "cn", "inds", "exp", "selText", "marketStats", "capName"}
    assert ctx["kind"]["id"] == s.case["kind"]
    assert ctx["cn"](12345) == "壹萬貳仟參佰肆拾伍元整"


def test_context_select_text_is_empty_for_regression_model() -> None:
    ctx, s = context_for("comp-reg")
    assert s.case["comp"]["method"] == "reg"
    assert ctx["selText"] == ""


@pytest.mark.parametrize(
    ("name", "mode"),
    [("income-cap-risk", "risk"), ("income-cap-wacc", "wacc"), ("income-cap-dcr", "dcr")],
)
def test_context_cap_name_follows_cap_mode(name: str, mode: str) -> None:
    ctx, s = context_for(name)
    assert s.case["income"]["capMode"] == mode
    assert ctx["capName"] == CAPNAMES[mode]
    assert ctx["capName"] != ""


def test_context_cap_name_is_empty_for_unknown_mode() -> None:
    s = SCENARIOS["base-115-0412-m1"]
    case = copy.deepcopy(s.case)
    case["income"]["capMode"] = "unknown"
    calc = calculate(case, s.model, REF, TODAY)
    assert report_context(case, calc, s.model, REF, TODAY)["capName"] == ""
