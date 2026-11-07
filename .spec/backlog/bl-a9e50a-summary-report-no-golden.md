**Problem:** snapshot 測試只比對敘述式（REPORT.build）；摘要式（buildSummary）只由 test/summary.js 的字串斷言檢查，沒有逐字標準答案。

**Context:** 出處：test/snapshot.js 只呼叫 E.REPORT.build 與 toHTML；test/summary.js 只用 has()/not() 檢查片語。摘要式報告是 reportFormat() 預設用於「抵押權設定 + 區分所有建物或透天厝」的案件，是常見案件。

**Suggested next step:** report-gen 開工前，先用舊版 node 引擎對 115-0412（設為抵押權設定、補上 chk 勾選答案，見 test/summary.js 的資料）與含他項權利、成本法的變化各產生 buildSummary 的 blocks 與 html 標準答案，存進 backend/tests/golden，再與 Python 比對。

**Why deferrable:** 屬於測試補強，需要舊版引擎還在；不影響敘述式 golden。
