"""golden 報告：每個情境的區塊與 HTML 必須和舊版輸出逐字相同。"""

import copy
import json
from datetime import date
from typing import Any

import pytest

from appraisal.domain.calc import calculate
from appraisal.domain.calc.cnamount import cn_amount
from appraisal.domain.calc.modelview import exp_of, inds_of
from appraisal.domain.calc.reference import market_stats, reference_from_db
from appraisal.domain.constants import kind_of
from appraisal.domain.report import build_report, render_html
from appraisal.domain.report.survey import report_format
from appraisal.domain.validate import validate
from appraisal.domain.validate.seltext import sel_text
from tests.domain.golden import Scenario, load_db, load_scenarios

SCENARIOS = load_scenarios()
REF = reference_from_db(load_db())
TODAY = date(2026, 11, 13)


def golden_ctx(case: dict[str, Any], model: dict[str, Any]) -> dict[str, Any]:
    """照 tools/golden-export.js 的 runCase 組報告脈絡（selText 一律有值、capName 一律空字串）。"""
    return {
        "kind": kind_of(case.get("kind")),
        "cn": cn_amount,
        "inds": inds_of(model, case),
        "exp": exp_of(model, case),
        "selText": sel_text(model),
        "marketStats": market_stats(case, model, REF, TODAY),
        "capName": "",
    }


def as_json(x: Any) -> Any:
    """區塊轉成 JSON 再讀回，和 golden 的比對基準一致（tuple 變 list）。"""
    return json.loads(json.dumps(x, ensure_ascii=False))


def test_scenario_count_and_formats() -> None:
    assert len(SCENARIOS) == 31
    assert sorted(s.name for s in SCENARIOS if s.format == "summary") == [
        "summary-115-0412-cost-lien",
        "summary-115-0412-mortgage",
        "summary-115-0420-land-forced",
    ]


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_format_matches_scenario(scenario: Scenario) -> None:
    assert report_format(scenario.case) == scenario.format


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_blocks_and_html_from_golden_calc(scenario: Scenario) -> None:
    """用舊版算出的 calc 與 validate 當輸入，單獨驗證報告本身逐字相同。"""
    case, model, expected = scenario.case, scenario.model, scenario.expected
    ctx = golden_ctx(case, model)
    blocks = build_report(case, copy.deepcopy(expected["calc"]), expected["validate"], ctx)
    assert as_json(blocks) == expected["blocks"]
    assert render_html(blocks) == expected["html"]


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_blocks_and_html_from_python_calc(scenario: Scenario) -> None:
    """整條路徑：Python 的 calculate 與 validate 再接報告，結果也要逐字相同。"""
    case, model, expected = scenario.case, scenario.model, scenario.expected
    calc = calculate(case, model, REF, TODAY)
    result = validate(case, calc, REF, TODAY)
    blocks = build_report(case, calc, result, golden_ctx(case, model))
    assert as_json(blocks) == expected["blocks"]
    assert render_html(blocks) == expected["html"]
