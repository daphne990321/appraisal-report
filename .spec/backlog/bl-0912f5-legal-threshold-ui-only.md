**Problem:** 模型設定中的法定門檻（單項與小計 15%、總調整率 30%、價格差距 20%、最少比較標的 3 件）只由網頁滑桿範圍與 MCP model_update 限制；資料庫與案件匯入都不檢查，可以被繞過。

**Context:** 出處：core/app2.js 第 541 行（滑桿 lim15 5–15、lim30 10–30、gapLim 5–20，hint 寫「§25 法定 15」）；mcp/server/index.js model_update 的 Math.min / Math.max 夾限；core/model.js importCaseFile 匯入模型時不檢查。技術規則 §25、§26、§27 是上限（只能更嚴）。

**Suggested next step:** calc-engine 的 ModelDocument 用 Pydantic validator 強制：lim15 ≤ 15、lim30 ≤ 30、gapLim ≤ 20、minComps ≥ 3；所有寫入（REST、MCP、匯入、遷移）都經過 schema。加測試：超出範圍的模型被拒絕，邊界值通過。遷移時要檢查現有模型有沒有超出（回報而不是靜默修正）。

**Why deferrable:** 屬於既有舊版程式的歷史問題，不是新版這輪的工作；新版節點的完成訊號不依賴它，但移植時不可把它帶過去。範圍小於一整個節點，不值得獨立 spec。
