"""設定（Settings 與 get_settings）的行為。"""

from collections.abc import Iterator
from pathlib import Path

import pytest

from appraisal.config import SettingsError, get_settings
from tests.fixtures.settings_environment import SETTINGS_ENVIRONMENT_NAMES

_SECRET_PASSWORD = "Quartz-Zebra-7731-secret"


@pytest.fixture(autouse=True)
def isolated_settings_environment(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> Iterator[None]:
    """清空設定用的環境變數，並把工作目錄換成空目錄；get_settings() 的快取前後都清掉。"""
    for name in SETTINGS_ENVIRONMENT_NAMES:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.chdir(tmp_path)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _set_required_variables(
    monkeypatch: pytest.MonkeyPatch, *, password: str = "unit-test-password"
) -> None:
    monkeypatch.setenv("POSTGRES_USER", "appraisal")
    monkeypatch.setenv("POSTGRES_PASSWORD", password)
    monkeypatch.setenv("POSTGRES_DB", "appraisal")


def test_process_environment_value_is_used_and_working_directory_dotenv_is_ignored(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    (tmp_path / ".env").write_text(
        "POSTGRES_HOST=host-from-dotenv-file\nPOSTGRES_PORT=6543\n", encoding="utf-8"
    )
    _set_required_variables(monkeypatch)
    monkeypatch.setenv("POSTGRES_HOST", "host-from-process-env")

    settings = get_settings()

    assert settings.postgres_host == "host-from-process-env", (
        "the process environment value should be used"
    )
    # .env 中的 POSTGRES_PORT 不能生效；這個值應該回到預設值。
    assert settings.postgres_port == 5432, (
        "a .env file in the working directory should not change settings"
    )


def test_missing_and_empty_required_variables_are_all_named_in_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # USER 與 PASSWORD 沒有設定；DB 設成空字串，同樣視為沒有設定。
    monkeypatch.setenv("POSTGRES_DB", "")

    with pytest.raises(SettingsError) as excinfo:
        get_settings()

    message = str(excinfo.value)
    for name in ("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"):
        assert name in message, f"SettingsError message should name {name}, got {message!r}"


def test_password_is_absent_from_settings_and_database_url_text_forms(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _set_required_variables(monkeypatch, password=_SECRET_PASSWORD)
    settings = get_settings()
    url = settings.database_url()

    # 先確認 URL 物件確實帶著密碼，下面的文字表示檢查才不會因為密碼根本沒進 URL 而通過。
    assert url.password == _SECRET_PASSWORD, (
        "the database URL should carry the password for connecting"
    )

    text_forms = {
        "repr(settings)": repr(settings),
        "str(settings)": str(settings),
        "str(database_url())": str(url),
        "repr(database_url())": repr(url),
        "str(database_url('other'))": str(settings.database_url("other")),
    }
    for label, rendered in text_forms.items():
        assert _SECRET_PASSWORD not in rendered, f"the password leaked through {label}"
