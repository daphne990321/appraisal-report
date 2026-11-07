"""CI 用：檢查 Settings、compose.yaml 與 .env.example 的環境變數清單是否一致。

規則：
- compose 的 `services.app.environment` 的 key 等於 Settings 的變數名稱減去 STATIC_DIR
  （STATIC_DIR 由 runtime image 設定，列在 compose 中會被空字串蓋掉）。
- Settings 的每個變數名稱都出現在 .env.example（`VAR=` 或 `# VAR=`）。
不符時列出缺少或多出的名稱，結束碼 1。
"""

import argparse
import json
import re
import sys
from pathlib import Path

from appraisal.config import Settings

# compose 不傳給 app 的 Settings 變數
NOT_IN_COMPOSE = frozenset({"STATIC_DIR"})
ENV_EXAMPLE_LINE = re.compile(r"^\s*#?\s*([A-Z][A-Z0-9_]*)=")


def settings_names() -> set[str]:
    return {name.upper() for name in Settings.model_fields}


def compose_names(compose_json: str) -> set[str]:
    config = json.loads(compose_json)
    return set(config["services"]["app"]["environment"])


def env_example_names(text: str) -> set[str]:
    return {m.group(1) for line in text.splitlines() if (m := ENV_EXAMPLE_LINE.match(line))}


def check(settings: set[str], compose: set[str], example: set[str]) -> list[str]:
    errors: list[str] = []
    expected = settings - NOT_IN_COMPOSE
    if missing := sorted(expected - compose):
        errors.append(f"Missing from compose.yaml app.environment: {', '.join(missing)}")
    if extra := sorted(compose - expected):
        errors.append(f"Unexpected in compose.yaml app.environment: {', '.join(extra)}")
    if missing := sorted(settings - example):
        errors.append(f"Missing from .env.example: {', '.join(missing)}")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--compose-json", required=True, help="Path of the JSON file, or - for stdin"
    )
    parser.add_argument("--env-example", required=True, type=Path)
    args = parser.parse_args(argv)

    compose_text = (
        sys.stdin.read() if args.compose_json == "-" else Path(args.compose_json).read_text()
    )
    errors = check(
        settings_names(),
        compose_names(compose_text),
        env_example_names(args.env_example.read_text(encoding="utf-8")),
    )
    for error in errors:
        print(error, file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
