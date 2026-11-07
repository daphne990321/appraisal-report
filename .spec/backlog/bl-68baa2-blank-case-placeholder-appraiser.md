**Problem:** blankCase 預設簽證估價師為「林○○」、事務所為「○○不動產估價師事務所」、公會為「[縣市]不動產估價師公會」。使用者忘了改，報告封面與函會印出看起來像真的假資料，而不是 ⟦…⟧ 待填標記。

**Context:** 出處：core/model.js 第 83–113 行 blankCase() 最後的 appraiser 物件。報告用它：core/report.js 封面、函、頁首（toDocx meta.office = c.appraiser.office）。steering 原則：資料不足的欄位在報告中標成 ⟦…⟧，不會被靜靜地留白或猜測。members 表已有 display_name 與 cert_no，offices 有名稱與公會。

**Suggested next step:** case-api 建立案件時，用建立者與事務所的資料預填 appraiser 物件（事務所名稱、公會、簽證估價師的姓名與證書字號，取自 cases.appraiser 指定的成員）；沒有資料的欄位留空，讓 validate 與報告標 ⟦…⟧。與問題 sign-authority 一起決定。

**Why deferrable:** 屬於既有舊版程式的歷史問題，不是新版這輪的工作；新版節點的完成訊號不依賴它，但移植時不可把它帶過去。範圍小於一整個節點，不值得獨立 spec。
