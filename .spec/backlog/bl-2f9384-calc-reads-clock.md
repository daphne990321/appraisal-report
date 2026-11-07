**Problem:** 價格日期沒填時，比較標的篩選與評分會用「今天」，所以同一份資料在不同日子結果不同；違反 steering「計算是純函式」。

**Context:** 出處：core/model.js 第 243 行 pdOf(c) = c.basic.priceDate || new Date().toISOString().slice(0,10)，被 subj、scoreOf、filteredSales、regression、cloudLvrSince（core/cloud.js）使用。golden 的示範案件都有 priceDate，所以測試沒抓到。

**Suggested next step:** calc-engine 的 calculate() 明確收 today 參數（由 Service 傳入），或在價格日期空白時回傳「缺價格日期」的檢查項並不計算相依結果。加測試：同一輸入、不同 today 的結果行為符合選擇。

**Why deferrable:** 屬於既有舊版程式的歷史問題，不是新版這輪的工作；新版節點的完成訊號不依賴它，但移植時不可把它帶過去。範圍小於一整個節點，不值得獨立 spec。
