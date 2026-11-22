"""報告用的格式工具：數字、日期、單價與待填欄位切割。"""

import math

from appraisal.domain.report.fmt import (
    amt_txt,
    f,
    num_txt,
    pc,
    ph,
    roc,
    sg,
    split_placeholders,
    unit_txt,
)

WAN = {"unitDisplay": "wan", "unitDec": 1, "totalDec": 0}
YUAN = {"unitDisplay": "yuan", "unitDec": 1, "totalDec": 0}


def test_f_groups_thousands_and_pads_decimals() -> None:
    assert f(1234567) == "1,234,567"
    assert f(1234.5, 2) == "1,234.50"
    assert f(1.005, 2) == "1.01"
    assert f("12.3", 1) == "12.3"


def test_f_returns_dash_for_empty_or_not_a_number() -> None:
    for v in (None, "", "abc", math.nan):
        assert f(v, 1) == "—"


def test_pc_and_sg_use_unicode_minus() -> None:
    assert pc(5) == "+5.0%"
    assert pc(-2.34) == "−2.3%"
    assert pc(0) == "0.0%"
    assert pc(None) == "—"
    assert pc(1.234, 2) == "+1.23%"
    assert sg(-1.234) == "−1.23"
    assert sg(None) == "0.00"
    assert sg(3, 1) == "+3.0"


def test_ph_marks_missing_values() -> None:
    assert ph("甲") == "甲"
    assert ph("") == "⟦待填⟧"
    assert ph(None, "委託人") == "⟦委託人⟧"
    assert ph(0, "數量") == "⟦數量⟧"
    assert ph(12) == "12"


def test_roc_converts_to_republic_era() -> None:
    assert roc("2026-11-13") == "民國 115 年 11 月 13 日"
    assert roc("2026-11") == "民國 115 年 11 月"
    assert roc("") == "⟦日期⟧"
    assert roc("abc") == "abc"


def test_unit_and_amount_text_follow_display_setting() -> None:
    assert unit_txt(53.74, WAN) == "53.7 萬元/坪"
    assert unit_txt(53.74, YUAN) == "537,400 元/坪"
    assert unit_txt(None, WAN) == "—"
    assert amt_txt(1975, 19750000, WAN) == "新臺幣 1,975 萬元"
    assert amt_txt(1975, 19750000, YUAN) == "新臺幣 19,750,000 元"
    assert amt_txt(None, None, WAN) == "⟦尚未決定⟧"


def test_num_txt_keeps_at_most_four_decimals() -> None:
    assert num_txt(1234.56789) == "1,234.5679"
    assert num_txt(5) == "5"
    assert num_txt("2.50") == "2.5"


def test_split_placeholders() -> None:
    assert split_placeholders("甲⟦乙⟧丙") == [("甲", False), ("乙", True), ("丙", False)]
    assert split_placeholders("⟦a⟧⟦b⟧") == [("a", True), ("b", True)]
    assert split_placeholders("") == []
    assert split_placeholders("無待填") == [("無待填", False)]
