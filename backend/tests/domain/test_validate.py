"""validate：golden 逐情境比對（忽略 section），以及 golden 沒有涵蓋的規則。"""

from copy import deepcopy
from datetime import date
from typing import Any

import pytest

from appraisal.domain.calc.library import reference_from_db
from appraisal.domain.validate import sel_text, validate
from appraisal.domain.validate.format import fmt, pct
from tests.domain.golden import load_db, load_scenarios
from tests.domain.golden_compare import compare_golden

SCENARIOS = load_scenarios()
DB = load_db()
REF = reference_from_db(DB)
TODAY = date(2026, 11, 13)
SECTIONS = {"subject", "comps", "income", "cost", "land", "final", "survey", "report"}


def _strip(out: dict[str, Any]) -> dict[str, Any]:
    stripped = deepcopy(out)
    for key in ("bl", "notes", "warns"):
        for msg in stripped[key]:
            del msg["section"]
    return stripped


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_golden_validate(scenario: Any) -> None:
    out = validate(scenario.case, scenario.expected["calc"], REF, TODAY, DB["models"])
    assert compare_golden(scenario.expected["validate"], _strip(out)) == []


def test_every_message_has_valid_section() -> None:
    seen = 0
    for s in SCENARIOS:
        out = validate(s.case, s.expected["calc"], REF, TODAY)
        for key in ("bl", "notes", "warns"):
            for msg in out[key]:
                assert msg["section"] in SECTIONS, (s.name, msg)
                seen += 1
    assert seen > 50


def test_fmt_matches_node() -> None:
    # 值取自舊版 Number(v).toLocaleString('zh-TW', {min/maxFractionDigits: d})
    assert fmt(1.005, 2) == "1.01"
    assert fmt(2.5, 0) == "3"
    assert fmt(-0.001, 0) == "-0"
    assert fmt(1234567.891, 1) == "1,234,567.9"
    assert fmt(-1234.5, 0) == "-1,235"
    assert fmt(0.285, 2) == "0.29"
    assert fmt(8.345, 2) == "8.35"
    assert fmt(1e-7, 2) == "0.00"
    assert fmt(3, 3) == "3.000"
    assert fmt(None) == "—"
    assert fmt("") == "—"
    assert fmt("abc") == "—"
    assert fmt("12.5", 1) == "12.5"
    assert fmt(float("inf"), 1) == "∞"


def test_pct_uses_unicode_minus() -> None:
    assert pct(5) == "+5.0%"
    assert pct(-2.25, 1) == "−2.3%"
    assert pct(0) == "0.0%"
    assert pct(None) == "—"
    assert pct("x") == "—"


def _model(**over: Any) -> dict[str, Any]:
    m = {
        "name": "測試模型",
        "select": {
            "sameCounty": True,
            "sameDistrict": False,
            "sameType": True,
            "sameZone": False,
            "months": 12,
            "ageTol": 10,
            "areaTolPct": 30,
            "floorTol": 3,
            "excludeSpecial": True,
            "excludePresale": False,
            "keyword": "",
        },
        "sources": {"lvr": True, "own": True},
    }
    m.update(over)
    return m


def test_sel_text_full() -> None:
    m = _model()
    assert sel_text(m) == (
        "比較標的依本所估價模型「測試模型」之選取條件，自內政部實價登錄及本所估價案例中篩選："
        "同縣市、同建物型態、交易日期在價格日期前 12 個月內、屋齡差距 10 年以內、"
        "面積差距 30% 以內、"
        "樓層差距 3 層以內、排除備註屬特殊交易者（§12、§21）。"
    )


def test_sel_text_no_source_and_keyword() -> None:
    m = _model(sources={"lvr": False, "own": False})
    m["select"]["keyword"] = "中山路"
    m["select"]["excludePresale"] = True
    text = sel_text(m)
    assert "自[資料來源]中篩選" in text
    assert "排除預售屋交易、地址含「中山路」（§12、§21）。" in text


def test_sel_text_on_golden_models() -> None:
    for s in SCENARIOS[:3]:
        assert sel_text(s.model).startswith("比較標的依本所估價模型「" + s.model["name"] + "」")
