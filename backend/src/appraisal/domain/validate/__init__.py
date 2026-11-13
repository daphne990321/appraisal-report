"""估價檢核：依估價結果產出必須處理的問題（bl）、報告附註（notes）、提醒（warns）與 15 項完成旗標。

對應舊版 core/model.js 的 validate；訊息與順序逐字相同，每則另加 section 供前端對應到步驟。
"""

from datetime import date
from typing import Any

from appraisal.domain.calc.library import ReferenceData
from appraisal.domain.validate import comparison, cost, final, income, items, land, subject, survey
from appraisal.domain.validate._msg import Messages
from appraisal.domain.validate.seltext import sel_text

__all__ = ["sel_text", "validate"]


def _collect_notes(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    comparison.notes(c, k, m)
    subject.parcel_notes(k, m)
    final.special_note(c, k, m)
    survey.access_notes(c, m)
    final.method_notes(c, k, m)
    subject.specific_price_note(c, m)
    income.note(c, m)
    cost.notes(c, m)
    land.note(c, m)
    survey.illegal_notes(c, m)


def _collect_blocks(c: dict[str, Any], k: dict[str, Any], m: Messages) -> None:
    comparison.blocks(c, k, m)
    income.blocks(c, k, m)
    land.block(c, k, m)
    final.count_blocks(c, k, m)
    subject.land_area_block(k, m)
    comparison.volume_blocks(c, k, m)
    income.hotel_block(c, m)
    subject.specific_price_block(c, k, m)
    final.diff_weight_blocks(c, k, m)


def validate(
    case: dict[str, Any],
    result: dict[str, Any],
    ref: ReferenceData,
    today: date,
    models: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """case 為案件，result 為 calculate() 的輸出。

    models 為目前的估價模型清單，舊版用它判斷案件原用的模型是否已被刪除；沒給就不檢查這一項
    （ReferenceData 不含模型，且計算結果的模型代號不能代替：呼叫端可能指定了別的模型）。
    ref、today 目前沒有規則用到，保留簽章以便之後規則需要參考資料或日期。
    """
    m = Messages()
    _collect_notes(case, result, m)
    _collect_blocks(case, result, m)
    cost.warns(case, result, m)
    subject.model_deleted_warn(case, result, models, m)
    flags = items.blocks(case, result, m)
    return {"bl": m.bl, "notes": m.notes, "warns": m.warns, "items": flags}
