"""內建估價模型：與舊版 defaultModel() 的輸出一致。"""

import json
from pathlib import Path
from typing import Any

from appraisal.domain.model.builtin import default_model
from appraisal.domain.model.document import ModelDocument
from tests.domain.golden import GOLDEN_DIR, load_db


def _fixture() -> dict[str, Any]:
    path: Path = GOLDEN_DIR / "inputs" / "default_model.json"
    result: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return result


def test_default_model_equals_legacy_fixture() -> None:
    assert default_model() == _fixture()


def test_conservative_default_model_equals_golden_m2() -> None:
    expected = load_db()["models"][1]
    assert default_model("m2", "抵押貸款保守模型", conservative=True) == expected


def test_default_model_returns_independent_copies() -> None:
    a, b = default_model(), default_model()
    a["settings"]["lim15"] = 99
    a["texts"]["stance"].append("x")
    a["exp"][0]["pct"] = 99
    assert b == _fixture()


def test_model_document_round_trips_golden_models() -> None:
    for model in [*load_db()["models"], _fixture()]:
        doc = ModelDocument.model_validate(model)
        assert doc.model_dump(by_alias=True, exclude_unset=True) == model


def test_model_document_keeps_unknown_fields() -> None:
    doc = ModelDocument.model_validate({"id": "x", "name": "y", "firmSetting": {"a": 1}})
    assert doc.to_dict() == {"id": "x", "name": "y", "firmSetting": {"a": 1}}


def test_default_model_equals_golden_m1() -> None:
    assert default_model() == load_db()["models"][0]
