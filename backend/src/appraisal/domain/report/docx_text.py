"""Word 文字：字型、段落間距與含待填欄位的 run（對照舊版 toDocx 的 runs、para）。"""

from typing import Any

from docx.enum.text import WD_COLOR_INDEX
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt
from docx.text.paragraph import Paragraph

from appraisal.domain.report.fmt import split_placeholders

ASCII_FONT = "Times New Roman"
EAST_ASIA_FONT = "標楷體"


def set_fonts(rpr_owner: Any) -> None:
    """在 run 或樣式的屬性中寫入英數與東亞字型。"""
    rpr = rpr_owner.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.insert(0, fonts)
    fonts.set(qn("w:ascii"), ASCII_FONT)
    fonts.set(qn("w:hAnsi"), ASCII_FONT)
    fonts.set(qn("w:eastAsia"), EAST_ASIA_FONT)


def set_spacing(par: Paragraph, after: int, line: int) -> None:
    """段落間距（twips）；行距用倍數（line/240）。"""
    spacing = par._p.get_or_add_pPr().get_or_add_spacing()
    spacing.set(qn("w:after"), str(after))
    spacing.set(qn("w:line"), str(line))
    spacing.set(qn("w:lineRule"), "auto")


def add_runs(par: Paragraph, text: Any, size: int = 24, bold: bool = False) -> None:
    """把文字加進段落；待填欄位 ⟦…⟧ 去掉符號並以黃底標出。size 單位為半點。"""
    for part, is_ph in split_placeholders("" if text is None else str(text)):
        run = par.add_run(part)
        run.font.size = Pt(size / 2)
        if bold:
            run.bold = True
        set_fonts(run._r)
        if is_ph:
            run.font.highlight_color = WD_COLOR_INDEX.YELLOW
