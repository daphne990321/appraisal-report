**Problem:** MCP 的 report_preview 與 report_docx 不管案件設定，一律輸出敘述式；網頁版會依 reportFormat() 選摘要式或敘述式。同一案件兩個入口的報告不同。

**Context:** 出處：mcp/server/index.js reportBlocks() 只呼叫 E.REPORT.build，沒有呼叫 reportFormat() 或 REPORT.buildSummary()。網頁版在 core/app3.js reportBlocks() 依 reportFormat(c) 選擇。steering product「報告格式一致」要求網頁下載與 MCP 產生的內容相同。

**Suggested next step:** report-gen 的 build_report() 內做格式選擇（auto 規則在 core/survey.js reportFormat），網頁與 MCP 只呼叫它。加一個跨入口測試：同一案件經 REST 與 MCP 取得的報告區塊相同，涵蓋摘要式（抵押權設定 + unit）與敘述式。

**Why deferrable:** 屬於既有舊版程式的歷史問題，不是新版這輪的工作；新版節點的完成訊號不依賴它，但移植時不可把它帶過去。範圍小於一整個節點，不值得獨立 spec。
