# Requirements Document

## Introduction

本功能把舊版的報告產生（core/report.js 的 build、buildSummary、toHTML、toDocx，以及 core/survey.js 的摘要式題庫與格式選擇）移植到新版後端的 `domain/report/`，成為純函式。報告先產生與格式無關的「區塊」（blocks），再轉成 HTML 或 Word。網頁預覽、下載與 MCP 都用同一條路徑。

本功能不包含計算與法規檢查（calc-engine，已完成）、REST 端點（case-api）、MCP 工具（mcp-endpoint）、事務所自訂範本（office-templates）。

| 角色 | 說明 |
|------|------|
| 估價師 | 看報告預覽、下載 Word、簽名的人 |
| 下游開發者 | 在 case-api、mcp-endpoint、frontend-app 呼叫本功能的人 |

## Alignment with Product Vision

product.md 的「計算只有一份」與「說人話、民國年」：報告上的每個數字都來自 calc-engine；文字、數字格式與舊版逐字相同，估價師換系統後看到的報告不變。

## Requirements

### Requirement 1：敘述式報告區塊

**User Story:** As a 估價師, I want 新版產生的敘述式報告和舊版逐字相同, so that 換系統不會讓報告內容改變。

#### Acceptance Criteria

1. WHEN 對 golden 的每一個敘述式情境產生區塊 THEN 結果 SHALL 和 golden 的 `blocks` 完全相同（JSON 逐字相同，不用容許誤差）。
2. 涵蓋 15 項必載事項、地號表、比較法、收益法、成本法、土地開發分析、特定價格各章節。
3. 資料不足的欄位 SHALL 標成 `⟦…⟧`，不可留白。
4. 數字格式 SHALL 與舊版相同（千分位、小數位、負號用「−」U+2212、民國年）。

### Requirement 2：摘要式報告區塊

**User Story:** As a 估價師, I want 抵押權設定的區分所有建物案件預設產生摘要式報告, so that 房貸案件照第十四號公報的格式交件。

#### Acceptance Criteria

1. WHEN 對 golden 的每一個摘要式情境產生區塊 THEN 結果 SHALL 和 golden 的 `blocks` 完全相同。
2. 格式選擇 SHALL 和舊版 reportFormat 相同：使用者指定優先；auto 時，估價目的為「抵押權設定」、標的為 unit 或 house、且未勾高價宅 → 摘要式，其餘 → 敘述式。
3. 摘要式題庫（SURVEY、AREA_ROWS、LIEN_COLS）SHALL 只有一份，放在後端 domain。

### Requirement 3：HTML 輸出

#### Acceptance Criteria

1. WHEN 把 golden 的 blocks 轉成 HTML THEN 結果 SHALL 和 golden 的 `html` 逐字相同。
2. 所有文字 SHALL 先跳脫（`&`、`<`、`>`、`"`）再輸出，`⟦…⟧` 轉成高亮標記；不可能從案件內容插入 HTML 或指令碼。

### Requirement 4：Word 輸出

#### Acceptance Criteria

1. WHEN 把 blocks 轉成 .docx THEN 用 python-docx 讀回後，標題、段落與表格的文字順序 SHALL 和 blocks 相同。
2. 版面 SHALL 和舊版 toDocx 相同：A4、上下左右邊界 1418 twips、中文標楷體、英數 Times New Roman、頁首「事務所　案號 …」、頁尾頁碼、表格灰框線與表頭底色。
3. `⟦…⟧` 在 Word 中 SHALL 以黃底標出，且不顯示「⟦」「⟧」符號。

### Requirement 5：報告脈絡與不輸出的欄位

#### Acceptance Criteria

1. 系統 SHALL 提供 `report_context()`，依舊版 app3.js reportCtx 由案件與計算結果組出 kind、cn、inds、exp、selText、marketStats、capName。
2. 目標價格 SHALL 不出現在任何報告輸出（敘述式、摘要式、HTML、Word），有自動測試。
3. 報告產生 SHALL 是純函式：不讀時鐘、環境變數、檔案或資料庫。

## Non-Functional Requirements

- domain 只 import 標準函式庫、Pydantic 與 python-docx（python-docx 只用在 `render_docx`）。
- 檔案 ≤ 300 行、函式 ≤ 50 行（structure.md）；超過時拆檔，對外入口名稱不變。
- 測試：`pytest tests/domain`、`ruff check`、`mypy` 全部通過；舊版 `npm test` 仍全部一致。
