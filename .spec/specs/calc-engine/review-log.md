# Review Log — calc-engine

> 本文件記錄這個功能的審查與決定過程。正式文件描述決定之後的樣子；本文件描述為什麼。正式文件中不引用本文件。

---

## 1. 決定紀錄

依 AGENTS.md「能先做決定就先做決定」，以下由建構師先決定，briefing 時逐項請使用者確認。

| ID | 問題 | 決定 | 理由 | 排除的選項 |
|---|---|---|---|---|
| C1 | q-numeric-tolerance | 浮點相對誤差 1e-9；文字逐字相同 | 只容許二進位最後幾位的差異，任何金額或單價差異都會被抓到 | 依類別訂誤差（規則多，容易放太寬）；比對顯示值（抓不到中間值錯誤） |
| C2 | q-rounding-semantics | js_round 逐位重現 | 報告上的數字不能因為換系統而改變 | Decimal HALF_UP（負數 .5 的結果不同） |
| C3 | q-open-map-typing | 固定欄位嚴格，動態 map 用 dict，extra=allow | 舊案件可能有多餘欄位，匯入不能失敗 | 全部嚴格（舊案件匯入失敗） |
| C4 | q-ols-implementation | 逐行移植，不加依賴 | p 值要和舊 golden 相同；tech.md 沒有 numpy/scipy | numpy/scipy |
| C5 | q-document-identity-fields | 文件內保留 id、signed、modelSnapshot，Service 強制一致 | 與舊案件檔匯出匯入相容 | 移出文件（要寫轉換，容易不一致） |
| C6 | q-reference-data-interface | domain 提供 prefilter() | 規則只有一份；預篩不比完整規則嚴格由測試保證 | 呼叫端自己寫預篩（兩份規則會不同步） |
| C7 | q-validate-location-key | 加 section 欄位 | domain 不知道畫面；前端對應步驟 | 直接回步驟代碼（domain 知道畫面） |
| C8 | q-schema-version-start | 延續 5 | 舊檔案直接可辨識 | 從 1 開始（要專用轉換器） |
| C9 | 計算內部用 dict 還是型別 | 內部用 dict + jsnum.n()，邊界用 Pydantic | 逐行對照舊版「缺欄位當 0」最不容易漏；驗證放寫入邊界 | 內部全型別（移植時改寫太多，難以對照） |

## 2. 環境

- 2026-11-13：這台 Mac 沒有 podman、uv、pnpm。domain 測試不需要資料庫，先用 Python 3.12 venv 執行 `pytest tests/domain`；CI 仍在容器中跑全部測試。需要資料庫的節點開工前，請使用者安裝 Podman Desktop。

## 3. 實作中的決定（2026-11-13）

| ID | 事項 | 決定 |
|---|---|---|
| C10 | 模組比 design 多出 _js.py、ols.py、library.py、prefilter.py、validate/_msg.py、format.py、case/sections.py、counties.py | 為了避免循環 import 與守住 300 行；對外入口名稱不變 |
| C11 | validate 的「估價模型已刪除」提醒要讀事務所的模型清單 | validate() 多一個可選參數 models；Service 呼叫時要傳 |
| C12 | 篩選門檻欄位不存在時 | 和舊版一樣當成 NaN（不排除），空字串仍是 0 |
| C13 | 特定價格區塊的欄位不存在時 | 用 n() 當 0（舊版會得到 NaN）。新案件一律由 blank_case 補齊欄位，所以不會發生；記錄為已知差異 |
| C14 | cnAmount 超過 1 京 | 保留舊版輸出（含 undefined 字樣），不是實際會出現的金額 |
| C15 | 舊版把 '2025/01/05' 這類日期當本地時間 | Python 當 UTC。golden 只有 YYYY-MM-DD；伺服器設台灣時區時才需要再檢查 |
| C16 | 測試資料較多的規則測試 | 預期值放 tests/domain/fixtures/validate_rules.json，測試檔維持 300 行內 |

結果：tests/domain 512 項通過；31 個 golden 情境的 calc、sales、marketStats、validate 全部零差異，容許誤差未放寬。
