"""jsnum：舊版 JavaScript 數值語意的邊界值。預期值皆由 node 實際執行取得。"""

import math
from typing import Any

import pytest

from appraisal.domain.jsnum import js_round, js_str, n, r2, round_to, to_fixed


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("", 0),
        (None, 0),
        ("12", 12),
        ("abc", 0),
        (True, 1),
        (False, 0),
        ("  7.5 ", 7.5),
        ("1e3", 1000),
        ("0x10", 16),
        (".5", 0.5),
        ("5.", 5),
        ("1_000", 0),
        ("nan", 0),
        ("inf", 0),
        ("Infinity", 0),
        (float("nan"), 0),
        (float("inf"), 0),
        ("12px", 0),
        (-3, -3),
        ({}, 0),
    ],
)
def test_n_matches_legacy_number_or_zero(value: Any, expected: float) -> None:
    assert n(value) == expected


def test_n_returns_float() -> None:
    assert isinstance(n("3"), float)


@pytest.mark.parametrize(
    ("value", "expected"),
    [(-2.5, -2), (2.5, 3), (0.5, 1), (-0.5, 0), (1.4, 1), (-1.5, -1), (0.49999999999999994, 0)],
)
def test_js_round_half_goes_toward_positive_infinity(value: float, expected: int) -> None:
    assert js_round(value) == expected


def test_js_round_keeps_non_finite() -> None:
    assert math.isnan(js_round(float("nan")))
    assert js_round(float("inf")) == float("inf")


def test_r2_keeps_legacy_float_error() -> None:
    assert r2(1.005) == 1  # 1.005*100 = 100.49999999999999
    assert r2(2.675) == 2.68
    assert r2(-1.255) == -1.25


def test_round_to() -> None:
    assert round_to(1234.5678, 1) == 1234.6
    assert round_to(1234.5, 0) == 1235
    assert round_to(-2.5, 0) == -2


@pytest.mark.parametrize(
    ("value", "digits", "expected"),
    [
        (1.005, 2, "1.00"),
        (1.255, 2, "1.25"),
        (2.5, 0, "3"),
        (-2.5, 0, "-3"),
        (0.5, 0, "1"),
        (2.675, 2, "2.67"),
        (10.235, 2, "10.23"),
        (8.345, 2, "8.35"),
        (-0.0001, 2, "-0.00"),
        (-0.0, 2, "0.00"),
        (0, 1, "0.0"),
        (123.456, 1, "123.5"),
        (1e21, 2, "1e+21"),
        (float("nan"), 2, "NaN"),
        (float("inf"), 2, "Infinity"),
    ],
)
def test_to_fixed_uses_exact_binary_value(value: float, digits: int, expected: str) -> None:
    assert to_fixed(value, digits) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (5, "5"),
        (5.0, "5"),
        (-0.0, "0"),
        (0.1, "0.1"),
        (1234.5678, "1234.5678"),
        (1e21, "1e+21"),
        (1e20, "100000000000000000000"),
        (123456789012345680000.0, "123456789012345680000"),
        (1e-7, "1e-7"),
        (1.5e-7, "1.5e-7"),
        (0.000001, "0.000001"),
        (0.000001234, "0.000001234"),
        (5e-324, "5e-324"),
        (1.7976931348623157e308, "1.7976931348623157e+308"),
        (float("nan"), "NaN"),
        (float("inf"), "Infinity"),
        (float("-inf"), "-Infinity"),
        (-1.5, "-1.5"),
        (True, "true"),
        (10**22, "1e+22"),
    ],
)
def test_js_str(value: Any, expected: str) -> None:
    assert js_str(value) == expected
