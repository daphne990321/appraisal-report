"""Settings 讀取的環境變數名稱。

名稱由 Settings.model_fields 推導：有 validation_alias（字串）時用 alias，否則用欄位名稱的大寫。
新增 Settings 欄位時，這裡會自動包含它，測試不需要另外維護清單。
"""

from pydantic.fields import FieldInfo

from appraisal.config import Settings


def _environment_name(field_name: str, field: FieldInfo) -> str:
    alias = field.validation_alias
    if isinstance(alias, str):
        return alias.upper()
    return field_name.upper()


SETTINGS_ENVIRONMENT_NAMES: tuple[str, ...] = tuple(
    _environment_name(field_name, field) for field_name, field in Settings.model_fields.items()
)
