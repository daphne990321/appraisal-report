# 舊版引擎 golden fixtures

這個資料夾存放舊版 Node 估價引擎（`core/`、`lib/engine.js`）的「輸入與標準答案」，
供 Python 移植版（calc-engine）逐筆比對計算、檢核與報告輸出。

## 內容

- `inputs/db.json`：計算需要的資料（估價模型、自有案例、匯入的實價登錄、內建實價登錄 `builtin`、範例案件）。
  只保留計算會讀的欄位（包含 `hideBuiltin`），不含畫面狀態。
- `cases/<名稱>.json`：一個情境一個檔案，內容為
  `name`、`description`（涵蓋的分支）、`case`（完整案件）、`modelId`（模型有被改動時另附 `model`）、
  `expected`（`calc`、`validate`、`marketStats`、`sales`、`blocks`、`html`）。
  摘要式報告情境另有 `"format": "summary"`，其 `blocks`／`html` 來自 `buildSummary`。
- `base-*`：3 個範例案件 × 2 個模型，與 `test/snapshots/` 同一組基礎情境。
- 其餘為「變化情境」：複製基礎情境後只切換一個計算分支，匯出時會檢查結果確實與基礎情境不同。

## 重新產生

```
npm run golden:export
```

`npm test` 會執行 `node tools/golden-export.js --check`，檔案與引擎輸出不一致就失敗。

這些檔案是舊版行為的標準答案，只能在「刻意」調整計算規則時重新產生，並在存檔訊息寫明原因；
舊版引擎退役後不再重新產生。內容僅含內建示範案件，不含任何個人資料。
