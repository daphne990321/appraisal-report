"""Word 輸出：用 python-docx 讀回，文字順序、版面與待填欄位標示必須正確。"""

from io import BytesIO
from typing import Any

import pytest
from docx import Document
from docx.enum.text import WD_COLOR_INDEX
from docx.oxml.ns import qn
from docx.shared import Twips
from docx.table import Table
from docx.text.paragraph import Paragraph

from appraisal.domain.report import render_docx
from appraisal.domain.report.blocks import Block, DocxMeta
from appraisal.domain.report.fmt import SECT, split_placeholders
from tests.domain.golden import Scenario, load_scenarios

SCENARIOS = load_scenarios()


def strip_ph(text: str) -> str:
    return "".join(part for part, _ in split_placeholders(text))


def expected_texts(blocks: list[Block]) -> list[str]:
    """依區塊順序列出 Word 應出現的文字（略過空字串與分頁）。"""
    out: list[str] = []
    for bk in blocks:
        t = bk["t"]
        if t == "cover":
            out += [bk["office"], bk["title"], *[x for r in bk["rows"] for x in r]]
        elif t == "letter":
            out += [bk["to"] + "　公鑒：", *bk["body"]]
            out.append(bk["office"] + "　估價師 " + bk["signer"] + "　敬上")
            out += [r[0] + "：" + r[1] for r in bk["certs"]]
        elif t in ("h1", "h2", "h3", "p", "amount"):
            out.append(bk["text"])
        elif t == "list":
            for i, item in enumerate(bk["items"]):
                out.append(("（" + SECT[i] + "）" if bk["ordered"] else "") + item)
        elif t == "kv":
            out += [x for r in bk["rows"] for x in r]
        elif t == "table":
            out += [*bk["head"], *[x for r in bk["rows"] for x in r]]
    return [strip_ph(x) for x in out if strip_ph(x) != ""]


def docx_texts(doc: Any) -> list[str]:
    """依本文順序讀回段落與表格儲存格的文字（略過空字串）。"""
    out: list[str] = []
    for child in doc.element.body.iterchildren():
        if child.tag == qn("w:p"):
            out.append(Paragraph(child, doc).text)
        elif child.tag == qn("w:tbl"):
            table = Table(child, doc)
            out += [c.text for row in table.rows for c in row.cells]
    return [x for x in out if x != ""]


def render(scenario: Scenario) -> tuple[Any, list[Block], DocxMeta]:
    blocks = scenario.expected["blocks"]
    case = scenario.case
    meta = DocxMeta(
        office=case["appraiser"]["office"],
        case_no=(case.get("report") or {}).get("caseNo") or case["id"],
    )
    return Document(BytesIO(render_docx(blocks, meta))), blocks, meta


def all_strings(x: Any) -> list[str]:
    if isinstance(x, str):
        return [x]
    if isinstance(x, list):
        return [s for item in x for s in all_strings(item)]
    if isinstance(x, dict):
        return [s for item in x.values() for s in all_strings(item)]
    return []


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_docx_text_order_matches_blocks(scenario: Scenario) -> None:
    doc, blocks, _ = render(scenario)
    assert docx_texts(doc) == expected_texts(blocks)


@pytest.mark.parametrize("scenario", SCENARIOS, ids=lambda s: s.name)
def test_docx_placeholders_are_yellow_without_brackets(scenario: Scenario) -> None:
    doc, blocks, _ = render(scenario)
    runs = [r for p in doc.paragraphs for r in p.runs]
    for table in doc.tables:
        runs += [r for row in table.rows for c in row.cells for p in c.paragraphs for r in p.runs]
    assert all("⟦" not in r.text and "⟧" not in r.text for r in runs)
    marked = {r.text for r in runs if r.font.highlight_color == WD_COLOR_INDEX.YELLOW}
    wanted: set[str] = set()
    for bk in blocks:
        for text in all_strings(bk):
            wanted |= {part for part, is_ph in split_placeholders(text) if is_ph}
    assert marked == wanted


def test_docx_page_layout_header_and_footer() -> None:
    doc, _, meta = render(SCENARIOS[0])
    section = doc.sections[0]
    assert section.page_width == Twips(11906)
    assert section.page_height == Twips(16838)
    for margin in (
        section.top_margin,
        section.bottom_margin,
        section.left_margin,
        section.right_margin,
    ):
        assert margin == Twips(1418)
    assert section.header.paragraphs[0].text == meta["office"] + "　案號 " + meta["case_no"]
    footer = section.footer.paragraphs[0]
    assert footer.text == "- 1 -"
    assert "PAGE" in [el.text for el in footer._p.iter(qn("w:instrText"))]


def test_docx_fonts_and_table_style() -> None:
    doc, _, _ = render(SCENARIOS[0])
    run = doc.paragraphs[0].runs[0]
    fonts = run._r.rPr.find(qn("w:rFonts"))
    assert fonts.get(qn("w:eastAsia")) == "標楷體"
    assert fonts.get(qn("w:ascii")) == "Times New Roman"
    normal = doc.styles["Normal"]
    assert normal.font.size is not None
    assert normal.font.size.pt == 12
    table = doc.tables[0]
    assert table._tbl.tblPr.find(qn("w:tblW")).get(qn("w:w")) == "9070"
    border = table.rows[0].cells[0]._tc.tcPr.find(qn("w:tcBorders")).find(qn("w:top"))
    got = (border.get(qn("w:val")), border.get(qn("w:sz")), border.get(qn("w:color")))
    assert got == ("single", "4", "808080")


def test_docx_table_header_row_repeats_and_rows_do_not_split() -> None:
    blocks: list[Block] = [
        {"t": "table", "head": ["甲", "乙"], "rows": [["1", "2"], ["3", "4"]], "align": ["l", "r"]}
    ]
    doc = Document(BytesIO(render_docx(blocks, DocxMeta(office="事務所", case_no="X"))))
    rows = doc.tables[0].rows
    head_pr, body_pr = rows[0]._tr.trPr, rows[1]._tr.trPr
    assert head_pr is not None
    assert body_pr is not None
    assert head_pr.find(qn("w:tblHeader")) is not None
    assert body_pr.find(qn("w:cantSplit")) is not None
    cell_pr = rows[0].cells[0]._tc.tcPr
    assert cell_pr is not None
    assert cell_pr.find(qn("w:shd")).get(qn("w:fill")) == "EEF2F1"
    assert rows[1].cells[1].paragraphs[0].alignment is not None
