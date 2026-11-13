"""validate：golden 沒有涵蓋的規則。

期望值由舊版 node 的 validate 對「base-115-0412-m1 改幾個欄位」算出（改動見各項第一欄，
路徑 c. 為案件、k. 為 calculate 結果），訊息逐字相同。
"""

import json
from copy import deepcopy
from datetime import date
from pathlib import Path
from typing import Any

import pytest

from appraisal.domain.calc.library import ReferenceData
from appraisal.domain.validate import validate
from tests.domain.golden import load_scenarios

BASE = next(s for s in load_scenarios() if s.name == "base-115-0412-m1")
# 每個情境：[改動, bl[(t, law, tab)], notes[(t, law)], warns[(t, law)], items]
# 預期文字由舊版引擎（node）對同樣改動跑 validate 得到。
CASES: dict[str, Any] = json.loads(
    (Path(__file__).parent / "fixtures" / "validate_rules.json").read_text(encoding="utf-8")
)


def _apply(c: dict[str, Any], k: dict[str, Any], changes: list[list[Any]]) -> None:
    for path, value in changes:
        root, *keys = path.split(".")
        node = c if root == "c" else k
        for key in keys[:-1]:
            node = node[key]
        node[keys[-1]] = deepcopy(value)


@pytest.mark.parametrize("name", list(CASES))
def test_rule_messages(name: str) -> None:
    changes, bl, notes, warns, items = CASES[name]
    c, k = deepcopy(BASE.case), deepcopy(BASE.expected["calc"])
    _apply(c, k, changes)
    out = validate(c, k, ReferenceData(), date(2026, 11, 13), [{"id": "m1"}])
    assert [(m["t"], m["law"], m["tab"]) for m in out["bl"]] == [tuple(x) for x in bl]
    assert [(m["t"], m["law"]) for m in out["notes"]] == [tuple(x) for x in notes]
    assert [(m["t"], m["law"]) for m in out["warns"]] == [tuple(x) for x in warns]
    assert out["items"] == items
