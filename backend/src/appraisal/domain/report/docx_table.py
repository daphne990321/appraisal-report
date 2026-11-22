"""Word 表格：灰框線、表頭底色、儲存格邊距與欄寬（對照舊版 toDocx 的 cellP、table）。"""

from typing import Any

from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Twips
from docx.table import _Cell

from appraisal.domain.report.docx_text import add_runs, set_spacing

TABLE_WIDTH = 9070
BORDER_COLOR = "808080"
HEAD_FILL = "EEF2F1"


def _child(parent: Any, tag: str, **attrs: str) -> Any:
    el = OxmlElement(tag)
    for key, value in attrs.items():
        el.set(qn("w:" + key), value)
    parent.append(el)
    return el


def _style_cell(cell: _Cell, width: int, shade: bool) -> None:
    """儲存格寬度、四邊框線、底色與邊距（元素順序依 OOXML 規定）。"""
    cell.width = Twips(width)
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = _child(tc_pr, "w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        _child(borders, "w:" + side, val="single", sz="4", space="0", color=BORDER_COLOR)
    if shade:
        _child(tc_pr, "w:shd", val="clear", color="auto", fill=HEAD_FILL)
    margins = _child(tc_pr, "w:tcMar")
    for side, size in (("top", 40), ("left", 80), ("bottom", 40), ("right", 80)):
        _child(margins, "w:" + side, w=str(size), type="dxa")


def _fill_cell(
    cell: _Cell, text: Any, width: int, size: int, bold: bool, shade: bool, right: bool
) -> None:
    _style_cell(cell, width, shade)
    par = cell.paragraphs[0]
    add_runs(par, text, size, bold)
    set_spacing(par, 0, 280)
    if right:
        par.alignment = WD_ALIGN_PARAGRAPH.RIGHT


def add_table(
    doc: Any,
    head: list[str] | None,
    rows: list[list[str]],
    widths: list[int],
    size: int,
    align: list[str] | None = None,
    label_col: bool = False,
    cant_split: bool = False,
) -> None:
    """加一個表格。label_col 為真時第一欄是粗體加底色的標籤欄（封面、鍵值表）。"""
    table = doc.add_table(rows=0, cols=len(widths))
    tbl_w = table._tbl.tblPr.find(qn("w:tblW"))
    tbl_w.set(qn("w:w"), str(TABLE_WIDTH))
    tbl_w.set(qn("w:type"), "dxa")
    for col, width in zip(table.columns, widths, strict=True):
        col.width = Twips(width)
    align = align or []
    if head:
        row = table.add_row()
        _child(row._tr.get_or_add_trPr(), "w:tblHeader")
        for i, text in enumerate(head):
            _fill_cell(row.cells[i], text, widths[i], size, True, True, False)
    for r in rows:
        row = table.add_row()
        if cant_split:
            _child(row._tr.get_or_add_trPr(), "w:cantSplit")
        for i, text in enumerate(r):
            label = label_col and i == 0
            right = i < len(align) and align[i] == "r"
            _fill_cell(row.cells[i], text, widths[i], size, label, label, right)
