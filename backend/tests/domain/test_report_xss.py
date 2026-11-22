"""案件文字含 HTML 或引號時，HTML 輸出只能出現跳脫後的文字。"""

import copy
from typing import Any

from appraisal.domain.report import build_report, render_html
from tests.domain.golden import load_scenarios
from tests.domain.test_report_golden import golden_ctx

SCRIPT = '<script>alert("x")</script>'
ESCAPED = "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"


def evil_html(name: str) -> str:
    """把案件裡的文字欄位都換成含指令碼與引號的字串，再產生 HTML。"""
    scenario = next(s for s in load_scenarios() if s.name == name)
    case: dict[str, Any] = copy.deepcopy(scenario.case)
    for key in ("client", "addr", "owner", "zone", "conditions", "purpose", "encumbrance"):
        case["basic"][key] = SCRIPT + key
    for key in ("general", "region", "indiv", "hbu"):
        case["analysis"][key] = SCRIPT + key
    case["appraiser"]["office"] = SCRIPT
    case["appraiser"]["name"] = "'" + SCRIPT
    case["other"] = SCRIPT + "\n" + SCRIPT
    case["final"]["reason"] = SCRIPT
    case.setdefault("report", {})["market"] = SCRIPT
    for cp in case["comps"]:
        cp["loc"] = SCRIPT
    ctx = golden_ctx(case, scenario.model)
    expected = scenario.expected
    blocks = build_report(case, copy.deepcopy(expected["calc"]), expected["validate"], ctx)
    return render_html(blocks)


def test_narrative_html_escapes_case_text() -> None:
    html = evil_html("base-115-0412-m1")
    assert "<script" not in html
    assert "</script" not in html
    assert ESCAPED in html
    assert "&#39;" in html


def test_summary_html_escapes_case_text() -> None:
    html = evil_html("summary-115-0412-mortgage")
    assert "<script" not in html
    assert ESCAPED in html
