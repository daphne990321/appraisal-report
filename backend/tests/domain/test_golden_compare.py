"""golden_compare：比對規則本身的測試。"""

from tests.domain.golden_compare import compare_golden


def test_identical_documents_have_no_differences() -> None:
    doc = {"a": 1, "b": [1.5, "x", None, True], "c": {"d": 2}}
    assert compare_golden(doc, {"a": 1, "b": [1.5, "x", None, True], "c": {"d": 2}}) == []


def test_float_uses_relative_tolerance() -> None:
    assert compare_golden(1000.0, 1000.0 + 1e-7) == []
    assert compare_golden(1000.0, 1000.0 + 1e-5) != []


def test_small_float_uses_absolute_floor_of_one() -> None:
    assert compare_golden(1e-12, 2e-12) == []
    assert compare_golden(0.0, 1e-8) != []


def test_int_and_float_compare_numerically() -> None:
    assert compare_golden(5, 5.0) == []
    assert compare_golden(5, 5.1) != []


def test_int_compared_exactly() -> None:
    assert compare_golden(1_000_000_000_000, 1_000_000_000_001) != []


def test_bool_is_not_a_number() -> None:
    assert compare_golden(True, 1) != []
    assert compare_golden(0, False) != []
    assert compare_golden(True, True) == []


def test_missing_key_equals_null() -> None:
    assert compare_golden({"a": 1, "b": None}, {"a": 1}) == []
    assert compare_golden({"a": 1}, {"a": 1, "b": None}) == []
    assert compare_golden({"a": 1}, {"a": 1, "b": 0}) != []


def test_nan_and_infinity_equal_null() -> None:
    assert compare_golden({"a": None}, {"a": float("nan")}) == []
    assert compare_golden({"a": None}, {"a": float("inf")}) == []
    assert compare_golden({"a": 1}, {"a": float("nan")}) != []


def test_arrays_need_same_length_and_order() -> None:
    assert compare_golden([1, 2], [1, 2, 3]) == ["$: expected length 2, actual length 3"]
    assert compare_golden([1, 2], [2, 1]) != []


def test_strings_are_exact() -> None:
    assert compare_golden("a", "a ") != []
    assert compare_golden("a", "a") == []


def test_type_mismatch_is_reported() -> None:
    assert compare_golden({"a": 1}, {"a": "1"}) == ["$.a: type mismatch, expected int, actual str"]
    assert compare_golden([1], {"0": 1}) != []


def test_differences_carry_paths() -> None:
    diffs = compare_golden({"x": [{"y": 1}]}, {"x": [{"y": 2}]})
    assert diffs == ["$.x[0].y: expected 1, actual 2"]


def test_differences_are_capped() -> None:
    diffs = compare_golden(list(range(100)), [v + 1 for v in range(100)])
    assert len(diffs) == 30
    assert len(compare_golden(list(range(100)), [v + 1 for v in range(100)], limit=5)) == 5
