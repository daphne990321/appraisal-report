"""報告脈絡：把案件與計算結果整理成報告需要的附帶資料（對照舊版 app3.js 的 reportCtx）。"""

from datetime import date
from typing import Any

from appraisal.domain.calc.cnamount import cn_amount
from appraisal.domain.calc.library import ReferenceData
from appraisal.domain.calc.modelview import exp_of, inds_of
from appraisal.domain.calc.reference import market_stats
from appraisal.domain.constants import CAPNAMES, kind_of
from appraisal.domain.validate.seltext import sel_text


def report_context(
    case: dict[str, Any],
    calc: dict[str, Any],
    model: dict[str, Any],
    ref: ReferenceData,
    today: date,
) -> dict[str, Any]:
    """組出報告用的 kind、cn、inds、exp、selText、marketStats、capName。

    計量模型（comp.method = reg）不用比較標的選取條件，selText 為空字串；
    capName 取收益資本化率方式的名稱，沒有對應名稱時為空字串。
    today 只在案件沒有價格日期時用來補價格日期，由呼叫端傳入，這裡不讀時鐘。
    """
    m = calc.get("M") or model
    try:
        stats = market_stats(case, m, ref, today)
    except Exception:  # 行情統計失敗不影響報告，只是少一句話（對照舊版 try/catch）
        stats = None
    return {
        "kind": kind_of(case.get("kind")),
        "cn": cn_amount,
        "inds": inds_of(m, case),
        "exp": exp_of(m, case),
        "selText": "" if case["comp"].get("method") == "reg" else sel_text(m),
        "marketStats": stats,
        "capName": CAPNAMES.get(case["income"].get("capMode"), ""),
    }
