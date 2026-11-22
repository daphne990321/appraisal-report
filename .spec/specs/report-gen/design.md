# Design Document

## Overview

逐函式移植 core/report.js 與 core/survey.js 到 `backend/src/appraisal/domain/report/`。目標是「行為相同」：保留舊版的字串組法、數字格式與區塊順序，用 golden 的 `blocks`、`html` 逐字比對。數值與格式工具沿用 calc-engine 已有的 `jsnum.py`（to_fixed、js_str、千分位）與 `dates.py`，不另寫一份。

## Steering Document Alignment

- tech.md：python-docx 產生 Word；domain 是純函式。
- structure.md：`domain/report/` 放報告區塊、敘述式、摘要式、HTML、Word；檔案 ≤ 300 行。
- product.md：目標價格不進報告；資料不足標 ⟦…⟧。

## 模組配置

```
backend/src/appraisal/domain/report/
├── __init__.py       # 對外入口：build_report、render_html、render_docx、report_format、report_context
├── blocks.py         # 區塊型別（TypedDict：cover、letter、h1、h2、h3、p、amount、list、kv、table、pb）與 P/KV/PB 小工具
├── fmt.py            # 舊版 report.js 的 n、f、pc、sg、V、roc、unitTxt、amtTxt、SECT、MNAME、MDEF；split_placeholders()
├── context.py        # report_context()（對照 app3.js reportCtx）
├── narrative.py      # build()：15 項必載事項與章節順序
├── sections.py       # parcelTable、compSection、incomeSection、costSection、landSection、specialSection
├── summary.py        # buildSummary()：itemTxt、groupRows、groupKV、lienLine
├── summary_tables.py # compTable、incomeTable、costTable
├── survey.py         # SURVEY、AREA_ROWS、LIEN_COLS、RESIDENTIAL_KINDS、chk_of、chk_get、chk_shown、survey_groups、report_format、survey_disclosures
├── html.py           # render_html()（esc、inl）
└── docx.py           # render_docx(blocks, meta) -> bytes（python-docx）
```

行數超過 300 時可再拆，但 `__init__.py` 的入口不變。

## 對外介面

```python
def report_format(case: dict) -> Literal["narrative", "summary"]: ...
def report_context(case: dict, calc: dict, model: dict, ref: ReferenceData, today: date) -> dict: ...  # today 由呼叫端傳入（價格日期空白時 market_stats 要用），domain 不讀時鐘
def build_report(case: dict, calc: dict, validate: list, ctx: dict,
                 fmt: Literal["narrative", "summary"] | None = None) -> list[Block]: ...
def render_html(blocks: list[Block]) -> str: ...
def render_docx(blocks: list[Block], meta: DocxMeta) -> bytes: ...   # meta: office、case_no
def split_placeholders(text: str) -> list[tuple[str, bool]]: ...     # [(文字, 是否待填)]
```

`fmt` 為 None 時用 `report_format(case)`。

## 待填欄位 ⟦…⟧

區塊內的字串沿用舊版：待填內容直接寫成 `⟦…⟧`（golden 逐字相同）。各輸出格式都用 `split_placeholders()` 切開，不各自寫正規式：HTML 轉成 `<span class="ph">…</span>`（照舊版 inl），Word 轉成黃底文字，MCP 之後轉成【待填：…】。

## Word

樣式全部由程式設定，數值照抄舊版 toDocx：A4（11906 × 16838 twips）、邊界 1418、預設字型東亞「標楷體」、英數「Times New Roman」、內文 12pt（size 24 半點）；表格寬 9070 twips，欄寬公式與舊版 table() 相同；框線 single size 4 色 808080；表頭底色 EEF2F1；頁首靠右「事務所　案號 …」9pt；頁尾置中「- 頁碼 -」（PAGE 欄位）。python-docx 沒有的設定（東亞字型、表頭重複、cantSplit、頁碼欄位）直接寫 OOXML 屬性。

事務所上傳自己的 Word 範本由 office-templates 負責；本功能的 `render_docx` 之後可以多收一個範本參數，不影響 blocks。

## 報告脈絡

`report_context()` 照 app3.js reportCtx：計量模型（comp.method = reg）時 selText 為空字串；capName 取 CAPNAMES[income.capMode]。golden 匯出時的 ctx 少了這兩個差別（selText 一律有值、capName 一律空字串），所以 golden 測試直接用 golden 匯出時的組法；`report_context()` 另寫單元測試檢查這兩個分支。

## 測試

- `tests/domain/test_report_golden.py`：31 個 golden 情境，依 `format` 選 narrative 或 summary，比 `blocks` 與 `html` 逐字相同。
- `tests/domain/test_report_docx.py`：每個 golden 情境產生 docx，用 python-docx 讀回，段落與表格文字依序和 blocks 對得上；檢查頁面尺寸、邊界、頁首文字、待填欄位是黃底且沒有「⟦」。
- `tests/domain/test_report_format.py`：report_format 的各分支；report_context 的 reg 與 capName 分支。
- 目標價格：在案件放入目標價格（例如 `targetPrice: 12345678`）後產生所有輸出，數字與欄位名稱都不出現。
- XSS：案件文字含 `<script>`、`"` 時，HTML 只出現跳脫後的文字。
