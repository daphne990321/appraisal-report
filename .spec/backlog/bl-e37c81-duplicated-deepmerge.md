**Problem:** 同一個深層合併函式存在兩份，另有第三種「以 blankCase 補齊缺欄」的用法，未來容易分歧。

**Context:** 出處：core/model.js 第 433 行 deepMerge（lib/engine.js 的 NEED 清單已匯出它）；mcp/server/index.js 第 70 行另寫一份（目前行為相同：陣列與 null 整個取代、物件遞迴）。使用處：importCaseFile（補齊缺欄）、MCP case_update 與 model_update（patch 合併）。steering structure.md「預設值與合併邏輯只有一份，放在 domain/case/」。

**Suggested next step:** calc-engine 在 domain/case 提供一個合併函式與一份測試（陣列取代、null 取代、巢狀物件、不修改輸入）；case-api 的匯入與 mcp-endpoint 的 patch 都用它。注意 MCP patch 是否沿用深層合併，見 mcp-endpoint 的問題 update-patch-and-version。

**Why deferrable:** 屬於既有舊版程式的歷史問題，不是新版這輪的工作；新版節點的完成訊號不依賴它，但移植時不可把它帶過去。範圍小於一整個節點，不值得獨立 spec。
