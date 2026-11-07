**Problem:** 簽名前「沒有必須修正項目」只在瀏覽器檢查；資料庫只檢查簽名者是 appraiser。繞過網頁直接呼叫資料庫 API 的 appraiser 可以簽有必須修正項目的案件。signedAt 與 modelSnapshot 也都由瀏覽器填。

**Context:** 出處：core/app3.js 第 598 行 act==='sign'：瀏覽器自己跑 validate、設 stage=deliver、複製模型快照、設 signedAt=today()；supabase/006_case_mgmt.sql guard_case 只檢查 role 與 old.signed。steering 與 product：簽名時由伺服器檢查必須修正項目、複製模型、鎖定。

**Suggested next step:** case-api 的簽名端點在伺服器：以 calc-engine 的 validate() 檢查（bl 非空就拒絕）、複製簽名當下的模型、signedAt 取伺服器時間（aware UTC），全部在同一個交易。測試：有必須修正項目時 REST 與 MCP 都被拒絕；非 appraiser 被拒絕；簽名後內容寫入被拒絕。

**Why deferrable:** 屬於既有舊版程式的歷史問題，不是新版這輪的工作；新版節點的完成訊號不依賴它，但移植時不可把它帶過去。範圍小於一整個節點，不值得獨立 spec。
