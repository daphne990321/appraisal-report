"""dates：月數差、年數差與 JS Date 解析。預期值由 node 實際執行取得。"""

from typing import Any

import pytest

from appraisal.domain.dates import months_between, years_between


@pytest.mark.parametrize(
    ("ym", "price_date", "expected"),
    [
        ("2026-07", "2026-09-30", 2),
        ("2025-11", "2026-09-30", 10),
        ("2026-09", "2026-07", -2),
        ("2025-12", "2026-01", 1),
        ("", "2026-09", 0),
        (None, "2026-09", 0),
        ("2026-09", "", 0),
        ("2026", "2026-09", 0),
        ("abc-xyz", "2026-09", 24321),
    ],
)
def test_months_between(ym: Any, price_date: Any, expected: float) -> None:
    assert months_between(ym, price_date) == expected


@pytest.mark.parametrize(
    ("d1", "d2", "expected"),
    [
        ("2018-06-20", "2026-09-30", 8),  # 跨年
        ("2018-10-01", "2026-09-30", 7),
        ("2000-08-28", "2026-09-30", 26),
        ("2026-01", "2026-12", 0),  # 7 碼補 -01
        ("2020-02-29", "2024-02-29", 4),  # 1461 天 ÷ 365.2425
        ("2026-09-30", "2018-06-20", 0),  # 反向取 0
        ("", "2026-09-30", 0),
        (None, "2026-09-30", 0),
        ("not a date", "2026-09-30", 0),
        ("2026-13-01", "2026-09-30", 0),
        ("2026-02-30", "2026-03-02", 0),  # V8：2 月 30 日順延為 3 月 2 日
        ("2025/01/05", "2026/01/05", 0),  # 兩個都是舊式格式，時區相同
        ("2018-6-20", "2026-09-30", 8),
    ],
)
def test_years_between_floor(d1: Any, d2: Any, expected: float) -> None:
    assert years_between(d1, d2) == expected


def test_years_between_exact_is_fractional() -> None:
    assert years_between("2018-06-20", "2026-09-30", exact=True) == pytest.approx(
        8.279430789133247, abs=1e-12
    )


def test_years_between_handles_time_and_offset() -> None:
    assert years_between("2020-01-01T00:00:00Z", "2021-01-01T00:00:00+08:00", exact=True) == (
        pytest.approx((366 * 24 - 8) / (365.2425 * 24), abs=1e-9)
    )
