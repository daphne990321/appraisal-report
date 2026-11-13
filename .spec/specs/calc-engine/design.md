# Design Document

## Overview

把舊版 JavaScript 估價核心逐函式移植到 `backend/src/appraisal/domain/`。移植的目標是「行為相同」，不是「改寫成更好的演算法」：每個函式對照舊版的同名函式，保留計算順序與捨入方式，結果用 golden 比對。

## Steering Document Alignment

- tech.md：domain 是純函式；計算只有一份；golden 比對採容許誤差，顯示數值逐字相同。
- structure.md：`domain/` 只 import 標準函式庫與 Pydantic；檔案 ≤ 300 行、函式 ≤ 50 行；預設值與合併邏輯只有一份，放 `domain/case/`。

## 模組配置

```
backend/src/appraisal/domain/
├── __init__.py
├── jsnum.py              # 舊版 JavaScript 數值語意：n()、js_round、round_to、r2、to_fixed、js_str
├── dates.py              # monthsBetween、yearsBetween、日期字串解析（舊版 Date 語意）
├── constants.py          # KINDS、COUNTIES、BTYPES、PURPOSES、SPECIALS、REGVARS、LEVELS、MNAMES、CAPNAMES、ITEMS15
├── case/
│   ├── __init__.py
│   ├── document.py       # CaseDocument（Pydantic，extra=allow）與子區段
│   ├── blank.py          # blank_case()
│   ├── merge.py          # deep_merge()（唯一一份）
│   └── upgrade.py        # schema_version 與升級函式鏈（起點 5）
├── model/
│   ├── __init__.py
│   ├── document.py       # ModelDocument（Pydantic，extra=allow）
│   └── builtin.py        # default_model() 與 defaultIndicatorSets 等內建資料
├── calc/
│   ├── __init__.py       # calculate(case, model, ref, today) 對外入口
│   ├── comparison.py     # compCalc、cellVal、dateAdjOf、deviationWeights
│   ├── regression.py     # ols、invert、gammln、betacf、betai、regression()
│   ├── income.py         # capRate、incomeCalc、loanConstant、discountFactor
│   ├── cost.py           # costCalc
│   ├── land.py           # landCalc、ldaDetailed、capitalInterest、floorUtil
│   ├── final.py          # finalCalc、modelWeights、purposeRule、special（特定價格）
│   ├── parcels.py        # parcelsCalc、landVAT
│   ├── cnamount.py       # cnAmount（中文大寫金額）
│   └── reference.py      # ReferenceData、filteredSales、scoreOf、filteredRents、marketStats、rentStats、quantile、subj、areaOf、prefilter()
└── validate/
    ├── __init__.py       # validate(case, result, ref, today)
    ├── rules_*.py        # 依區段拆檔（基本資料、比較法、收益法、成本法、土地、最後價格）
    └── seltext.py        # selText
```

檔名在實作時可以依 300 行限制再拆，但對外入口固定：`calculate()`、`validate()`、`blank_case()`、`default_model()`、`upgrade_case_document()`、`prefilter()`。

## 資料形狀

### 輸入

- `CaseDocument`、`ModelDocument`：Pydantic v2，`model_config = ConfigDict(extra="allow", populate_by_name=True)`。JSON key 沿用舊版 camelCase。固定欄位有型別；動態 map（例如比較標的的 `adj`、`subjFlags`、`report.regionChecks`）用 `dict[str, 值型別]`。
- 計算函式內部讀的是 `model_dump(by_alias=True)` 後的 dict。理由：舊版大量用「欄位不存在就當 0 或空字串」的寫法（`Number(x)||0`），用 dict 加 `jsnum.n()` 逐行對照最不容易漏掉；型別驗證放在寫入邊界（case-api）。
- `ReferenceData`：`sales`（實價登錄買賣，已轉成舊版 record 形狀）、`rents`、`own`（本所案例）、`sources`。呼叫端負責從資料庫取出；`prefilter(case, model, today)` 回傳 SQL 預篩條件（縣市、區、期間、種類），條件只用到 filteredSales 規則中「一定會排除」的部分，所以預篩不會比完整規則嚴格。

### 輸出

- `calculate()` 回傳 JSON 相容的 dict，key 與舊版 `calc()` 回傳值相同（comp、reg、cost、inc、land、fin、mc、P、M、W、S、parcels、special、area、isLand）。
- 理由：報告產生、畫面與 MCP 都直接讀這些 key；先保持與舊版相同，逐步加 TypedDict 說明，不在移植時改形狀。

## 數值語意（和舊版一模一樣）

| 舊版 | 新版 | 說明 |
|---|---|---|
| `Math.round(x)` | `jsnum.js_round(x)` | `math.floor(x + 0.5)`；-2.5 → -2，2.5 → 3 |
| `Math.round(x*100)/100`（r2） | `jsnum.r2(x)` | 先乘再 js_round 再除，保留舊版浮點誤差 |
| `roundTo(x, dec)` | `jsnum.round_to(x, dec)` | 同上，10 的次方用 `10 ** dec`（整數次方與 JS `Math.pow` 相同） |
| `Number(x)`、`Number(x)\|\|0`、`n(x)` | `jsnum.n(x)` | `''`、None、無法解析的字串 → 0；`'12'` → 12；布林 → 0／1；`isFinite` 失敗 → 0 |
| `x.toFixed(d)` | `jsnum.to_fixed(x, d)` | 依 IEEE 754 精確值捨入（`decimal.Decimal(x).quantize(..., ROUND_HALF_UP)`），與 JS 規格相同 |
| `toLocaleString('zh-TW')` | report-gen 負責 | 本功能不輸出文字數字，validate 訊息除外，見下 |
| `String(number)` | `jsnum.js_str(x)` | 整數不帶 `.0`；用 `repr` 的最短表示，與 JS 相同 |
| `NaN`、`Infinity` | `float('nan')`、`float('inf')` | JSON 輸出時轉 null（JS `JSON.stringify` 行為） |
| `a.sort(cmp)` | `sorted(..., key=cmp_to_key)` | 兩者都是穩定排序 |
| `str.localeCompare` | 一般字串比較 | 只用在 `YYYY-MM` 形式的日期字串，結果相同 |

validate 訊息中有數字的地方（例如「差異 24.7%」），逐一對照舊版用的是 `toFixed`、`fmt()` 還是字串串接，用對應的 jsnum 函式。

## golden 比對

- 來源：`backend/tests/golden/`（由舊版 `tools/golden-export.js` 產生；`inputs/db.json` 與 `cases/*.json`）。
- 測試：`backend/tests/domain/test_golden.py` 對每個情境呼叫 `calculate()`、`validate()`、`filteredSales()`、`marketStats()`，和 `expected` 比對。
- 比對規則（`tests/domain/golden_compare.py`）：
  - 字串、布林、整數、null：逐字相同。
  - 浮點數：`abs(a-b) <= 1e-9 * max(1, abs(a), abs(b))`。理由：只容許最後幾位的二進位誤差（pow、log 實作不同、加總順序），金額到元、單價到小數位數的差異都會被抓到。
  - 缺少的 key 與值為 null 視為相同（JS 的 undefined 不會出現在 JSON）。
  - 陣列長度與順序必須相同。
  - 放寬任何一項都要在 review-log 寫理由。
- `M`（模型）與 `S`（設定）也在輸出中，比對時一併比對，可抓到預設值移植錯誤。

## 決定（對應路線圖問題）

| 問題 | 決定 |
|---|---|
| q-numeric-tolerance | 相對誤差 1e-9（上面的比對規則）；文字輸出逐字相同 |
| q-rounding-semantics | 寫 `js_round`，逐位重現舊行為 |
| q-open-map-typing | 固定欄位嚴格、動態 map 用 `dict[str, 型別]`、整份 `extra="allow"` |
| q-ols-implementation | 逐行移植 ols、invert、gammln、betacf、betai，不加依賴 |
| q-document-identity-fields | 文件內保留 id、signed、modelSnapshot（與舊案件檔相容）；Service 寫入時強制與資料表欄位相同 |
| q-reference-data-interface | domain 提供 `prefilter()` 產生預篩條件，呼叫端只執行查詢，domain 再套完整規則 |
| q-validate-location-key | 檢查結果加 `section`（subject、comps、income、cost、land、final、survey、report），由前端對應到步驟；golden 比對時忽略 section |
| q-schema-version-start | 延續舊版：目前形狀是 5；以後改形狀才升到 6，升級函式鏈從 5 開始 |

## 時鐘

舊版 `pdOf(c)` 在價格日期空白時讀今天日期。新版 `calculate(case, model, ref, today)` 的 `today` 是必要參數（`datetime.date`），由 Service 傳入。測試：同一案件、價格日期空白、不同 today，結果依 today 改變；價格日期有值時 today 不影響結果。

## 測試

| 測試 | 檔案 |
|---|---|
| golden 全部情境 | tests/domain/test_golden.py |
| jsnum 邊界（-2.5、0.5、1.005、toFixed、n('')） | tests/domain/test_jsnum.py |
| 日期差（跨年、月底、民國年字串） | tests/domain/test_dates.py |
| blank_case 與 default_model 等於 golden 中的形狀 | tests/domain/test_case_document.py |
| today 參數（不讀時鐘） | tests/domain/test_today.py |
| prefilter 不比完整規則嚴格（對 golden 的每個情境：完整規則選到的每筆都通過 prefilter） | tests/domain/test_prefilter.py |
| domain 不 import 其他 appraisal 子套件 | tests/domain/test_domain_imports.py |

domain 測試不需要資料庫，可以只跑 `pytest tests/domain`。
