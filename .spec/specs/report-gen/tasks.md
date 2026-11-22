# Tasks Document

## Task Status Markers

| Marker | Meaning | Description |
|------|------|------|
| `[ ]` | To do | Task not yet started |
| `[x]` | Done | Implemented and verified to pass |
| `[~]` | Needs rework | Affected by a design change, needs reimplementation |
| `[-]` | Removed | Removed by a design change, code already cleaned up |

## 執行說明

- golden 由舊版 `npm run golden:export` 產生，本 spec 不改 golden。
- 每個 Phase 完成後跑 `pytest tests/domain`、`ruff check`、`mypy`。

---

## Phase 1：基礎

- [x] 1. 格式工具與區塊型別
  - File: domain/report/fmt.py、blocks.py、tests/domain/test_report_fmt.py
  - 對照 core/report.js 第 9–23 行（n、f、pc、sg、V、roc、unitTxt、amtTxt、SECT、MNAME、MDEF）；split_placeholders。
- [x] 2. 摘要式題庫與格式選擇
  - File: domain/report/survey.py、tests/domain/test_report_format.py
  - 對照 core/survey.js 全檔。
- [x] 3. golden 報告比對測試骨架
  - File: tests/domain/test_report_golden.py（先載入 31 個情境，組 ctx 的方式照 tools/golden-export.js runCase）

## Phase 2：區塊

- [x] 4. 敘述式 build 與各章節
  - File: domain/report/narrative.py、sections.py
  - golden 敘述式情境的 blocks 全部逐字相同。
- [x] 5. 摘要式 buildSummary
  - File: domain/report/summary.py、summary_tables.py
  - 3 個摘要式 golden 情境的 blocks 全部逐字相同。
- [x] 6. report_context
  - File: domain/report/context.py；reg 與 capName 分支的單元測試。

## Phase 3：輸出

- [x] 7. render_html
  - File: domain/report/html.py；golden 的 html 全部逐字相同；XSS 測試。
- [x] 8. render_docx
  - File: domain/report/docx.py、tests/domain/test_report_docx.py；pyproject 加 python-docx。
- [x] 9. 目標價格不輸出的測試、domain import 限制測試更新、清理
  - File: tests/domain/test_report_target_price.py、tests/domain/test_domain_imports.py
