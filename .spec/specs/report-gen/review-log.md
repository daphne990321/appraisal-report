# Review Log — report-gen

> 本文件記錄這個功能的審查與決定過程。正式文件描述決定之後的樣子；本文件描述為什麼。正式文件中不引用本文件。

---

## 1. 決定紀錄

依 AGENTS.md「能先做決定就先做決定」，以下由建構師先決定，briefing 時逐項請使用者確認。

| ID | 問題 | 決定 | 理由 | 排除的選項 |
|---|---|---|---|---|
| R1 | q-docx-style-source | A：樣式全部由程式設定，數值照抄舊版 | 和舊版一致、可以測試；事務所上傳 Word 範本是 office-templates 的範圍，之後在 render_docx 加範本參數即可 | B 現在就用範本檔（要先有範本管理，office-templates 才做）；C 同上 |
| R2 | q-placeholder-contract | C：字串內嵌 ⟦…⟧ 為儲存格式，另提供 split_placeholders() 給各輸出格式使用 | golden 逐字相同；每種輸出不用各寫一份正規式，之後加 PDF 也只呼叫同一個函式 | A 各自寫正規式（容易不一致）；B 結構化片段（golden 全部要重產，和舊版不再能逐字比對） |
| R3 | q-survey-definition-home | A：題庫定義放後端 domain/report/survey.py，之後由 case-api 提供給前端產生表單 | 單一來源，現勘表單和摘要式報告不會不同步 | B 前後端各一份（會不同步）；C build 時複製 JSON（多一個建置步驟，仍是兩份檔案） |
| R4 | q-html-renderer-keep | A：保留 render_html；前端是否改用 React 直接畫 blocks 留給 frontend-app 決定 | golden 的 html 可以逐字比對；下載 .html 與 MCP 不受影響；blocks 不變，前端之後選 React 也不用改這裡 | B 取消伺服器端 HTML（失去 html golden 與下載 .html） |

## 2. 已知差異

- R5：golden 匯出時的報告脈絡和實際畫面略有不同（計量模型時 selText、capName）。golden 測試照匯出時的組法；report_context() 照畫面的組法，另寫單元測試。

## 3. 實作中的決定

實作時自己做的小決定，沒有改變第 1 節的設計決定。

| ID | 問題 | 決定 | 理由 |
|---|---|---|---|
| I1 | golden 的數量 | 實際是 31 個情境檔（`cases/*.json`），加 3 個輸入檔共 34 個檔案；3 個摘要式、28 個敘述式 | 任務文字寫的 34 是檔案數；`test_golden.py` 也斷言 31 個情境。31 個情境的 blocks 與 html 全部逐字相同 |
| I2 | `report_context()` 的簽章 | 多收一個 `today: date` 參數：`report_context(case, calc, model, ref, today)` | `market_stats()` 在案件沒有價格日期時要用今天補日期；報告產生必須是純函式，不能自己讀時鐘，所以由呼叫端傳入 |
| I3 | 區塊型別 | `Block` 用 `dict[str, Any]`，不用 TypedDict 聯集；`DocxMeta` 用 TypedDict | 區塊要和 golden 的 JSON 逐字比對，欄位依種類不同（align、small 沒給就不放）；TypedDict 聯集對 mypy 沒有實際幫助，只增加轉型 |
| I4 | 多拆的檔案 | `env.py`（共用衍生資料）、`narrative_body.py`（壹貳參）、`sections_money.py`（收益法、成本法）、`sections_land.py`（地號表、土地開發分析、特定價格）、`summary_head.py`（摘要式封面與摘要表）、`survey_data.py`、`survey_data1.py`、`survey_data2.py`（題庫）、`docx_text.py`、`docx_table.py` | 檔案 ≤ 300 行、函式 ≤ 50 行；`__init__.py` 的入口名稱不變。舊版 build 內的區域變數（amt、title、methodsUsed 等）收進 `Env`，各章節函式共用 |
| I5 | 題庫資料 | `SURVEY` 由舊版 `core/survey.js` 用一次性腳本轉成 Python 字面值，再手動確認資料；`survey.py` 只放函式 | 避免手抄出錯；題庫仍然只有後端這一份 |
| I6 | python-docx 的使用範圍 | 只有 `docx.py`、`docx_text.py`、`docx_table.py` 可以 import `docx`；`__init__.py` 的 `render_docx` 在呼叫時才 import。`test_domain_imports.py` 改成只允許這三個檔案用 python-docx | 其他報告程式維持只用標準函式庫；沒有用到 Word 的人（例如只要 HTML）不用載入 python-docx |
| I7 | Word 與舊版 docx 函式庫輸出的差異 | 版面數值照抄舊版，但檔案結構不會逐位元相同：標題用 python-docx 內建的 Heading 1～3 樣式（文字色強制為黑）；頁碼用 PAGE 欄位，欄位預設文字為 1；行距用 OOXML 直接寫 `w:spacing` | python-docx 與 docx（JS）是不同的函式庫。測試檢查文字順序、頁面大小、邊界、字型、框線、表頭底色、表頭重複、不跨頁與待填欄位黃底 |
| I8 | 缺值的字串化 | 缺欄位（JS 的 undefined）和 JSON 的 null 在 Python 都是 None，字串相加時一律得到「null」，舊版缺欄位會得到「undefined」 | 案件文件經 upgrade 後欄位齊全，golden 沒有缺欄位的情境；不另外區分 undefined 與 null |
| I9 | golden 測試的輸入 | 每個情境測兩次：(a) 用 golden 的 `expected.calc`、`expected.validate` 當輸入，單獨驗證報告；(b) 用 Python 的 `calculate()` 與 `validate()` 當輸入，驗證整條路徑 | (a) 不受計算誤差影響，錯了就是報告的問題；(b) 確認 calc-engine 的輸出形狀夠報告用。兩者都逐字相同 |
| I10 | 欄位寬度的四捨五入 | Word 表格第一欄寬用 `js_round`（Math.round 語意），不用 Python 的 `round` | Python 的 round 是銀行家捨入，與舊版 Math.round 在 .5 時不同 |
| I11 | 依賴與環境 | `pyproject.toml` 的 dependencies 加 `python-docx`；`uv.lock` 這台 Mac 沒有 uv，保持原樣；`.gitignore` 加 `.venv/` | 合併前要在有 uv 的環境執行 `uv lock` 更新鎖定檔 |
