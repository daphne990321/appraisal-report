**Problem:** 下載失敗以外的異常（404、伺服器回網頁、解析不出資料列）被當成「尚未公布」並略過，sync log 仍寫 ok=true；如果內政部改了網址或格式，整次同步全部略過，但畫面上「最近一次成功同步」仍更新。

**Context:** 出處：tools/lvr-sync.js 的 NotPublished 例外：HTTP 404、content-type 為 html、importLvr 回 error、「沒有可用的資料列」都歸為略過；寫 log 時 ok: rec.status !== '失敗'；結束碼只在「失敗」時為 1。core/cloud.js cloudLvrLastSync 只看 ok=true 的最新一筆。

**Suggested next step:** lvr-sync 區分「該季尚未公布」（預期中、只在最新一季）與「不預期的略過」（舊的季、全部縣市都略過）；後者視為失敗並記錄。sync log 加 status 欄位（success、skipped、failed）而不只是布林。加測試：全部略過時整次同步標為失敗。

**Why deferrable:** 屬於既有舊版程式的歷史問題，不是新版這輪的工作；新版節點的完成訊號不依賴它，但移植時不可把它帶過去。範圍小於一整個節點，不值得獨立 spec。
