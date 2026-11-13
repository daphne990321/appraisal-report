"""golden 載入工具：讀取舊版引擎匯出的輸入與情境。"""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

GOLDEN_DIR = Path(__file__).resolve().parent.parent / "golden"


@dataclass(frozen=True)
class Scenario:
    """一個 golden 情境：案件、解析後的模型與舊版輸出。"""

    name: str
    description: str
    case: dict[str, Any]
    model: dict[str, Any]
    model_id: str
    format: str
    expected: dict[str, Any]


def _read(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_db() -> dict[str, Any]:
    """讀 inputs/db.json（模型、自有案例、匯入與內建實價登錄）。"""
    result: dict[str, Any] = _read(GOLDEN_DIR / "inputs" / "db.json")
    return result


def resolve_model(doc: dict[str, Any], db: dict[str, Any]) -> dict[str, Any]:
    """情境有 inline model 就用它，否則依 modelId 到 db.models 找。"""
    inline = doc.get("model")
    if inline:
        return dict(inline)
    for model in db["models"]:
        if model["id"] == doc["modelId"]:
            return dict(model)
    raise KeyError(f"model not found: {doc['modelId']}")


def load_scenarios() -> list[Scenario]:
    """依檔名排序列出全部情境。"""
    db = load_db()
    scenarios: list[Scenario] = []
    for path in sorted((GOLDEN_DIR / "cases").glob("*.json")):
        doc = _read(path)
        scenarios.append(
            Scenario(
                name=doc["name"],
                description=doc["description"],
                case=doc["case"],
                model=resolve_model(doc, db),
                model_id=doc["modelId"],
                format=doc.get("format", "narrative"),
                expected=doc["expected"],
            )
        )
    return scenarios
