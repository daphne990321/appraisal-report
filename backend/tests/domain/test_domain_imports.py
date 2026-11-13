"""domain 只能用標準函式庫、pydantic 與 domain 自己，不得依賴其他層。"""

import ast
import sys
from pathlib import Path

import appraisal.domain

ROOT = Path(appraisal.domain.__file__).parent
ALLOWED_THIRD_PARTY = {"pydantic", "typing_extensions"}


def _imported_modules(path: Path) -> list[str]:
    names: list[str] = []
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            names += [a.name for a in node.names]
        elif isinstance(node, ast.ImportFrom):
            assert node.level == 0, f"{path}: relative import"
            names.append(node.module or "")
    return names


def _ok(name: str) -> bool:
    top = name.split(".")[0]
    if top == "appraisal":
        return name == "appraisal.domain" or name.startswith("appraisal.domain.")
    return top in sys.stdlib_module_names or top in ALLOWED_THIRD_PARTY


def test_domain_imports_only_stdlib_pydantic_and_domain() -> None:
    files = sorted(ROOT.rglob("*.py"))
    assert files
    bad = [f"{p.relative_to(ROOT)}: {m}" for p in files for m in _imported_modules(p) if not _ok(m)]
    assert bad == []
