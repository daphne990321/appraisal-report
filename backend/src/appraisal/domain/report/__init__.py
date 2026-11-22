"""報告產生：案件與計算結果 → 區塊 → HTML 或 Word（對照舊版 core/report.js、core/survey.js）。

純函式：不讀時鐘、環境變數、檔案或資料庫。
"""

from typing import Any, Literal

from appraisal.domain.report.blocks import Block, DocxMeta
from appraisal.domain.report.context import report_context
from appraisal.domain.report.fmt import split_placeholders
from appraisal.domain.report.html import render_html
from appraisal.domain.report.narrative import build
from appraisal.domain.report.summary import build_summary
from appraisal.domain.report.survey import report_format

__all__ = [
    "Block",
    "DocxMeta",
    "build_report",
    "render_docx",
    "render_html",
    "report_context",
    "report_format",
    "split_placeholders",
]


def build_report(
    case: dict[str, Any],
    calc: dict[str, Any],
    validate: dict[str, Any],
    ctx: dict[str, Any],
    fmt: Literal["narrative", "summary"] | None = None,
) -> list[Block]:
    """產生報告區塊；fmt 沒給就依 report_format(case) 決定。"""
    kind = fmt or report_format(case)
    if kind == "summary":
        return build_summary(case, calc, validate, ctx)
    return build(case, calc, validate, ctx)


def render_docx(blocks: list[Block], meta: DocxMeta | None = None) -> bytes:
    """把報告區塊轉成 .docx 檔的位元組；meta 可放 office 與 case_no。"""
    from appraisal.domain.report.docx import render_docx as _render

    return _render(blocks, meta or DocxMeta())
