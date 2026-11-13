# Requirements Document

## Introduction

本功能把舊版的估價計算與法規檢查（core/calc.js、core/model.js 的 calc / validate 與相關函式、core/data.js 的內建模型與常數）移植到新版後端的 `domain/`，成為純函式。移植後，網頁、Word、MCP、AI 看到的數字都由這一份 Python 程式算出。

本功能不包含報告產生（report-gen）、實價登錄下載與 CSV 解析（lvr-sync）、資料庫與 API（case-api）。

本文件中的角色：

| 角色 | 說明 |
|------|------|
| 估價師 | 使用計算結果決定價格並簽名的人 |
| 下游開發者 | 在 case-api、report-gen、mcp-endpoint 呼叫本功能的人 |

## Alignment with Product Vision

product.md 的「計算正確」與「計算只有一份」：移植後的結果必須和舊版的 golden（backend/tests/golden）一致，舊版的數字是估價師已經用過、檢查過的標準。

## Requirements

### Requirement 1：案件與估價模型的資料形狀

**User Story:** As a 下游開發者, I want 用一個有驗證的型別讀寫案件文件與估價模型, so that 寫入的資料一定是計算看得懂的形狀。

#### Acceptance Criteria

1. WHEN 讀入舊版 v5 的案件文件 THEN 系統 SHALL 接受它，並保留不認得的欄位（舊案件可能有多餘欄位）。
2. WHEN 建立新案件 THEN 系統 SHALL 產生和舊版 blankCase() 相同的預設值。
3. WHEN 取得內建估價模型 THEN 系統 SHALL 回傳和舊版 defaultModel() 相同的內容。
4. 預設值與合併邏輯 SHALL 只有一份。

### Requirement 2：計算

**User Story:** As a 估價師, I want 新版算出的價格和舊版完全相同, so that 換系統不會讓報告上的數字改變。

#### Acceptance Criteria

1. WHEN 對 golden 的每一個情境執行計算 THEN 結果 SHALL 在 design.md 訂的容許誤差內和 golden 相同。
2. 計算 SHALL 是純函式：輸入案件、估價模型、參考資料（實價登錄、本所案例）與今天的日期，不讀時鐘、環境變數或全域狀態。
3. WHEN 價格日期空白 THEN 計算 SHALL 用呼叫端傳入的 today，不自己讀時鐘。
4. 涵蓋比較法（百分率、差額、計量模型）、收益法（直接資本化、DCF、各種收益資本化率）、成本法（3 種折舊）、土地開發分析（簡易、詳細）、權重與最後價格、地號、特定價格。

### Requirement 3：法規檢查

**User Story:** As a 估價師, I want 簽名前的檢查和舊版一樣嚴格、訊息一樣, so that 不會漏掉必須修正的項目。

#### Acceptance Criteria

1. WHEN 對 golden 的每一個情境執行檢查 THEN 必須修正、必須說明、提醒三類訊息 SHALL 逐字相同，順序相同，法條出處相同。
2. 15 項必載事項的檢查結果 SHALL 相同。

### Requirement 4：比較標的篩選與市場行情

**User Story:** As a 估價師, I want 系統挑出的比較標的和舊版相同, so that 試算的依據一致。

#### Acceptance Criteria

1. WHEN 對 golden 的每一個情境篩選比較標的 THEN 標的的 id 與順序 SHALL 相同。
2. 市場行情統計（筆數、中位數、四分位數、平均、月變動率）SHALL 在容許誤差內相同。
3. 系統 SHALL 提供一個函式，產生資料庫預先篩選實價登錄用的條件，條件不比完整規則嚴格（讓 lvr-sync 不必自己寫一份規則）。

## Non-Functional Requirements

### Code Architecture and Modularity
- 程式放在 `backend/src/appraisal/domain/`，只 import 標準函式庫與 Pydantic。
- 檔案不超過 300 行、函式不超過 50 行；依估價方法分檔。
- 註解寫法條依據（不動產估價技術規則條號）。

### Reliability
- golden 比對測試涵蓋全部情境（3 個示範案件 × 2 個模型，加上 tools/golden-export.js 產生的分支情境）。
- 不新增第三方依賴（不使用 numpy / scipy）。
