"""報告區塊轉成 Word（.docx）（對照舊版 core/report.js 的 toDocx）。

版面數值照抄舊版：A4（11906 × 16838 twips）、邊界 1418、預設字型東亞「標楷體」、
英數「Times New Roman」、內文 12pt；表格寬 9070 twips；框線 single size 4 色 808080；
表頭底色 EEF2F1；頁首靠右「事務所　案號 …」9pt；頁尾置中「- 頁碼 -」。
python-docx 沒有的設定（東亞字型、表頭重複、不跨頁、頁碼欄位）直接寫 OOXML 屬性。
"""

from io import BytesIO
from typing import Any

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor, Twips
from docx.text.paragraph import Paragraph

from appraisal.domain.jsnum import js_round
from appraisal.domain.report.blocks import Block, DocxMeta
from appraisal.domain.report.docx_table import add_table
from appraisal.domain.report.docx_text import ASCII_FONT, add_runs, set_fonts, set_spacing
from appraisal.domain.report.fmt import SECT

PAGE_W, PAGE_H, MARGIN = 11906, 16838, 1418
_ALIGN = {
    "center": WD_ALIGN_PARAGRAPH.CENTER,
    "right": WD_ALIGN_PARAGRAPH.RIGHT,
}
_HEADING_STYLE = {"h1": "Heading 1", "h2": "Heading 2", "h3": "Heading 3"}
_HEADING_SIZE = {"h1": 32, "h2": 28, "h3": 24}
_HEADING_AFTER = {"h1": 200, "h2": 120, "h3": 80}


def _para(doc: Any, text: Any, **o: Any) -> Paragraph:
    """一般段落：size（半點）、bold、align、after、indent_first、left、hanging。"""
    par: Paragraph = doc.add_paragraph()
    add_runs(par, text, o.get("size", 24), o.get("bold", False))
    set_spacing(par, o.get("after", 120), 360)
    if o.get("align"):
        par.alignment = _ALIGN[o["align"]]
    fmt = par.paragraph_format
    if o.get("indent_first"):
        fmt.first_line_indent = Twips(o["indent_first"])
    if o.get("left"):
        fmt.left_indent = Twips(o["left"])
        fmt.first_line_indent = Twips(-o.get("hanging", 0))
    return par


def _heading(doc: Any, bk: Block) -> None:
    t = bk["t"]
    par = doc.add_paragraph(style=_HEADING_STYLE[t])
    add_runs(par, bk["text"], _HEADING_SIZE[t], True)
    for run in par.runs:
        run.font.color.rgb = RGBColor(0, 0, 0)
    set_spacing(par, _HEADING_AFTER[t], 360)
    par.paragraph_format.keep_with_next = True


def _cover(doc: Any, bk: Block) -> None:
    _para(doc, bk.get("office"), align="center", size=32, bold=True, after=600)
    _para(doc, bk["title"], align="center", size=52, bold=True, after=800)
    add_table(doc, None, bk["rows"], [2000, 7070], size=26, label_col=True)


def _letter(doc: Any, bk: Block) -> None:
    _para(doc, bk["to"] + "　公鑒：", bold=True, size=26)
    for text in bk["body"]:
        _para(doc, text, indent_first=480)
    signer = (bk.get("office") or "") + "　估價師 " + str(bk.get("signer")) + "　敬上"
    _para(doc, signer, align="right", after=60)
    for r in bk["certs"]:
        _para(doc, r[0] + "：" + r[1], align="right", size=20, after=0)


def _list(doc: Any, bk: Block) -> None:
    ordered = bk.get("ordered")
    for i, item in enumerate(bk["items"]):
        prefix = "（" + (SECT[i] if i < len(SECT) else str(i + 1)) + "）" if ordered else ""
        _para(doc, prefix + item, left=480, hanging=480 if ordered else 0)


def _table_block(doc: Any, bk: Block) -> None:
    rows, head, small = bk["rows"], bk.get("head"), bk.get("small")
    first_row = head or (rows[0] if rows else [])
    nc = len(first_row)
    first = int(js_round(9070 * min(0.3, 1.6 / (nc + 0.6)))) if nc > 2 else round(9070 * 0.5)
    rest = (9070 - first) // (nc - 1) if nc > 1 else 9070
    widths = [first] + [rest] * max(0, nc - 1)
    size = 17 if small else 20
    add_table(doc, head, rows, widths, size, align=bk.get("align") or [], cant_split=True)
    _para(doc, "", after=80)


def _kv_block(doc: Any, bk: Block) -> None:
    add_table(doc, None, bk["rows"], [2540, 6530], size=20, label_col=True, cant_split=True)
    _para(doc, "", after=80)


def _page_break(doc: Any) -> None:
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def _body(doc: Any, blocks: list[Block]) -> None:
    for bk in blocks:
        t = bk["t"]
        if t in _HEADING_STYLE:
            _heading(doc, bk)
        elif t == "p":
            _para(doc, bk["text"], indent_first=480)
        elif t == "amount":
            _para(doc, bk["text"], align="center", bold=True, size=32, after=240)
        elif t == "cover":
            _cover(doc, bk)
        elif t == "letter":
            _letter(doc, bk)
        elif t == "list":
            _list(doc, bk)
        elif t == "kv":
            _kv_block(doc, bk)
        elif t == "table":
            _table_block(doc, bk)
        elif t == "pb":
            _page_break(doc)


def _field_run(par: Paragraph, kind: str) -> None:
    """頁碼欄位的一個片段：begin、instr、separate、end。"""
    run = par.add_run()
    run.font.size = Pt(9)
    set_fonts(run._r)
    if kind == "instr":
        el = OxmlElement("w:instrText")
        el.set(qn("xml:space"), "preserve")
        el.text = "PAGE"
    else:
        el = OxmlElement("w:fldChar")
        el.set(qn("w:fldCharType"), kind)
    run._r.append(el)


def _header_footer(doc: Any, meta: DocxMeta) -> None:
    section = doc.sections[0]
    section.page_width, section.page_height = Twips(PAGE_W), Twips(PAGE_H)
    for side in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
        setattr(section, side, Twips(MARGIN))
    section.header.is_linked_to_previous = False
    head = section.header.paragraphs[0]
    head.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_runs(head, meta.get("office", "") + "　案號 " + meta.get("case_no", ""), 18)
    section.footer.is_linked_to_previous = False
    foot = section.footer.paragraphs[0]
    foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_runs(foot, "- ", 18)
    for kind in ("begin", "instr", "separate"):
        _field_run(foot, kind)
    add_runs(foot, "1", 18)
    _field_run(foot, "end")
    add_runs(foot, " -", 18)


def _base_style(doc: Any) -> None:
    normal = doc.styles["Normal"]
    normal.font.name = ASCII_FONT
    normal.font.size = Pt(12)
    set_fonts(normal.element)


def render_docx(blocks: list[Block], meta: DocxMeta) -> bytes:
    """把報告區塊轉成 .docx 檔的位元組。"""
    doc = Document()
    _base_style(doc)
    _header_footer(doc, meta)
    props = doc.core_properties
    props.author = meta.get("office") or "估價報告產生器"
    props.title = "不動產估價報告書 " + meta.get("case_no", "")
    _body(doc, blocks)
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()
