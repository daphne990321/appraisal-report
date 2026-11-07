**Problem:** 網頁版產生新案號時，年份寫死為 115，到民國 116 年仍會產生 115-xxxx。

**Context:** 出處：core/app3.js 第 491 行 nextId()（'115-' + 流水號，且取所有年度的最大流水號）；core/cloud.js 第 266 行 cloudFreeNo()（案號被別人用走時換號，一樣寫死 '115-'）。MCP 版 mcp/server/index.js nextId() 是對的：依當年度民國年，只在同年度內找最大流水號。兩邊行為不一致。steering tech.md「案件編號」已規定：民國年-流水號、年份由後端依當下日期計算、同事務所內不重複。

**Suggested next step:** case-api 實作案號產生時，不要沿用網頁版邏輯；以 MCP 版的「同年度內取最大 + 1」為語意基礎，並用唯一約束加重試處理並行。細節見 case-api 的問題節點 case-number-generation。為 116 年跨年、同年並行建立兩件案件各寫一個測試。

**Why deferrable:** 屬於既有舊版程式的歷史問題，不是新版這輪的工作；新版節點的完成訊號不依賴它，但移植時不可把它帶過去。範圍小於一整個節點，不值得獨立 spec。
