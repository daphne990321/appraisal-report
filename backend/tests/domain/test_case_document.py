"""案件文件：blank_case、deep_merge、升級與 CaseDocument 的往返。"""

import json
from typing import Any

import pytest

from appraisal.domain.case.blank import blank_case
from appraisal.domain.case.document import CaseDocument
from appraisal.domain.case.merge import deep_merge
from appraisal.domain.case.upgrade import CURRENT_SCHEMA_VERSION, upgrade_case_document
from appraisal.domain.constants import KINDS
from appraisal.domain.model.builtin import default_model
from tests.domain.golden import GOLDEN_DIR, load_db, load_scenarios

BLANK_CASES: list[dict[str, Any]] = json.loads(
    (GOLDEN_DIR / "inputs" / "blank_cases.json").read_text(encoding="utf-8")
)


def test_blank_cases_fixture_covers_every_kind() -> None:
    assert [c["kind"] for c in BLANK_CASES] == [k["id"] for k in KINDS]


@pytest.mark.parametrize("expected", BLANK_CASES, ids=lambda c: c["kind"])
def test_blank_case_equals_legacy_output(expected: dict[str, Any]) -> None:
    assert blank_case(expected["id"], default_model(), None, expected["kind"]) == expected


def test_blank_case_defaults_to_unit_kind() -> None:
    assert blank_case("x", default_model())["kind"] == "unit"
    assert blank_case("x", default_model(), kind=None)["kind"] == "unit"
    assert blank_case("x", default_model(), kind="unknown")["kind"] == "unit"


def test_blank_case_inherits_location_from_previous_case() -> None:
    previous = {"basic": {"county": "高雄市", "district": "前金區"}}
    basic = blank_case("x", default_model(), previous)["basic"]
    assert (basic["county"], basic["district"]) == ("高雄市", "前金區")


def test_blank_case_uses_kind_weights_or_purpose_weights() -> None:
    m = default_model()
    assert blank_case("x", m, kind="hotel")["final"]["w"]["income"] == 50
    # unit 的 kindWeights 為 null：改用估價目的「買賣參考」的權重
    assert blank_case("x", m, kind="unit")["final"]["w"] == m["purpose"]["買賣參考"]["w"]


def test_blank_case_final_weights_are_copied() -> None:
    m = default_model()
    c = blank_case("x", m, kind="hotel")
    c["final"]["w"]["income"] = 1
    assert m["kindWeights"]["hotel"]["income"] == 50


def test_blank_case_lda_zero_falls_back_to_default_like_js_or() -> None:
    m = default_model()
    m["lda"]["profit"] = 0
    assert blank_case("x", m)["land"]["profit"] == 20


def test_deep_merge_nested_objects() -> None:
    a = {"x": {"p": 1, "q": 2}, "y": 1}
    assert deep_merge(a, {"x": {"q": 3, "r": 4}}) == {"x": {"p": 1, "q": 3, "r": 4}, "y": 1}
    assert a == {"x": {"p": 1, "q": 2}, "y": 1}  # 不改動 a


def test_deep_merge_arrays_and_null_replace() -> None:
    assert deep_merge({"l": [1, 2], "o": {"a": 1}}, {"l": [3], "o": None}) == {"l": [3], "o": None}
    assert deep_merge({"l": 1}, {"l": [{"a": 1}]}) == {"l": [{"a": 1}]}


def test_deep_merge_non_object_inputs_follow_js() -> None:
    assert deep_merge({"a": 1}, 5) == 5
    assert deep_merge({"a": 1}, None) is None
    assert deep_merge({"a": 1}, [1]) == [1]
    assert deep_merge(None, {"a": {"b": 1}}) == {"a": {"b": 1}}
    assert deep_merge("text", {"a": 1}) == {"a": 1}
    assert deep_merge({"a": [1]}, {"a": {"b": 1}}) == {"a": {"b": 1}}
    assert deep_merge({"a": {"b": 1}}, {"a": 5}) == {"a": 5}


def test_deep_merge_of_blank_case_keeps_missing_defaults() -> None:
    m = default_model()
    merged = deep_merge(blank_case("1", m), {"id": "1", "basic": {"area": 10}})
    assert merged["basic"]["area"] == 10
    assert merged["basic"]["county"] == "新竹縣"


def test_upgrade_current_version_returns_equal_copy() -> None:
    doc = blank_case("1", default_model())
    out = upgrade_case_document(doc)
    assert CURRENT_SCHEMA_VERSION == 5
    assert out == doc
    assert out is not doc
    assert upgrade_case_document(doc, from_version=5) == doc


def test_upgrade_rejects_newer_and_unknown_versions() -> None:
    doc = blank_case("1", default_model())
    with pytest.raises(ValueError, match="unsupported"):
        upgrade_case_document(doc, from_version=6)
    with pytest.raises(ValueError, match="no upgrade step"):
        upgrade_case_document(doc, from_version=4)


def _all_case_documents() -> list[dict[str, Any]]:
    docs = [s.case for s in load_scenarios()]
    docs += list(load_db()["cases"])
    docs += BLANK_CASES
    return docs


@pytest.mark.parametrize("doc", _all_case_documents(), ids=lambda d: str(d["id"]))
def test_case_document_round_trips_exactly(doc: dict[str, Any]) -> None:
    parsed = CaseDocument.model_validate(doc)
    assert parsed.model_dump(by_alias=True, exclude_unset=True) == doc
    # JSON 文字也要相同（含 key 順序）
    dumped = parsed.model_dump_json(by_alias=True, exclude_unset=True)
    assert json.loads(dumped) == doc


def test_case_document_keeps_unknown_sections_and_fields() -> None:
    doc = {"id": "1", "chk": {"noLien": True}, "basic": {"newField": 5}}
    assert CaseDocument.model_validate(doc).to_dict() == doc
