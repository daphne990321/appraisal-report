"""目標價格只是案件中的欄位，不得出現在任何報告輸出。"""

import copy
import json
from io import BytesIO
from typing import Any

import pytest
from docx import Document

from appraisal.domain.report import build_report, render_docx, render_html
from appraisal.domain.report.blocks import DocxMeta
from tests.domain.golden import Scenario, load_scenarios
from tests.domain.test_report_docx import docx_texts
from tests.domain.test_report_golden import golden_ctx

SCENARIOS = load_scenarios()
TARGET = 12345678
PICKS = ["base-115-0412-m1", "summary-115-0412-mortgage", "base-115-0420-m1"]


def outputs(case: dict[str, Any], scenario: Scenario) -> list[str]:
    """同一案件的區塊 JSON、HTML 與 Word 文字。"""
    expected = scenario.expected
    ctx = golden_ctx(case, scenario.model)
    blocks = build_report(case, copy.deepcopy(expected["calc"]), expected["validate"], ctx)
    docx = Document(BytesIO(render_docx(blocks, DocxMeta(office="所", case_no="X"))))
    return [
        json.dumps(blocks, ensure_ascii=False),
        render_html(blocks),
        "\n".join(docx_texts(docx)),
    ]


@pytest.mark.parametrize("name", PICKS)
def test_target_price_is_never_printed(name: str) -> None:
    scenario = next(s for s in SCENARIOS if s.name == name)
    plain = outputs(scenario.case, scenario)
    case = copy.deepcopy(scenario.case)
    case["targetPrice"] = TARGET
    case["basic"]["targetPrice"] = TARGET
    case["final"]["targetPrice"] = TARGET
    with_target = outputs(case, scenario)
    assert with_target == plain
    for text in with_target:
        assert "12345678" not in text
        assert "12,345,678" not in text
        assert "目標價格" not in text
        assert "targetPrice" not in text
