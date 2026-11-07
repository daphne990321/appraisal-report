**Problem:** 3 個示範案件 × 2 個模型的 golden 沒涵蓋許多計算分支，移植到 Python 時這些分支沒有標準答案可比。

**Context:** 用 node 檢查 E.fresh() 的 3 件案件：比較法只有 pct + grade（沒有 diff、reg 計量模型、amt 輸入）；權重模式只有 manual（沒有 deviation、inverse）；收益法 capMode 只有 extract 與 input（沒有 risk、wacc、dcr、egim）；DCF 只有旅館一件；成本法折舊只有 straight（沒有 declining、sinking）；土地開發 detailed 只有 iMode=table（沒有 formula、input）；special 特定價格從未啟用；dateMode 只有 auto；unitDisplay 只有 wan；priceType 只有正常價格（沒有 ask 擬售價格與 bargain）。檔案：core/model.js sampleCase、sampleLand、sampleHotel；test/snapshot.js。

**Suggested next step:** calc-engine 的 spec 加一組額外的 golden：先用舊版 node 引擎對修改過的樣本案件（逐一切換上述分支）算出標準答案，存進 backend/tests/golden，再與 Python 比對。這些案件的產生程式可以是一次性的 node 腳本（舊版還在時做）。

**Why deferrable:** 屬於測試補強，需要舊版引擎還在才好做標準答案；範圍涵蓋多個計算分支，需要自己的設計。
