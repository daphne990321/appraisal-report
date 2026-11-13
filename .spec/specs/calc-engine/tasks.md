# Tasks Document

## Task Status Markers

| Marker | Meaning | Description |
|------|------|------|
| `[ ]` | To do | Task not yet started |
| `[x]` | Done | Implemented and verified to pass |
| `[~]` | Needs rework | Affected by a design change, needs reimplementation |
| `[-]` | Removed | Removed by a design change, code already cleaned up |

## 執行說明

- golden 由舊版 `npm run golden:export` 產生，本 spec 不改 golden。
- 每個 Phase 完成後跑 `pytest tests/domain`、`ruff check`、`mypy`。

---

## Phase 1：基礎

- [x] 1. 數值與日期語意
  - File: backend/src/appraisal/domain/jsnum.py, dates.py, tests/domain/test_jsnum.py, tests/domain/test_dates.py
  - 對照 core/calc.js 的 n、r2、roundTo、monthsBetween、yearsBetween 與 core/model.js 的 fmt、pct。
- [x] 2. golden 載入與比對工具
  - File: backend/tests/domain/golden.py, golden_compare.py, test_golden.py（先只載入並列出情境）
- [x] 3. 常數與內建模型
  - File: domain/constants.py, domain/model/*
  - 對照 core/data.js（KINDS、COUNTIES、BTYPES、PURPOSES、SPECIALS、REGVARS、LEVELS、defaultModel 與 default*）。
- [x] 4. 案件文件、blank_case、deep_merge、升級鏈
  - File: domain/case/*, tests/domain/test_case_document.py

## Phase 2：計算

- [x] 5. 比較法（含計量模型）
  - File: domain/calc/comparison.py, regression.py
- [x] 6. 收益法、成本法、土地開發分析、地號、中文金額
  - File: domain/calc/income.py, cost.py, land.py, parcels.py, cnamount.py
- [x] 7. 參考資料、篩選、市場行情、prefilter
  - File: domain/calc/reference.py, tests/domain/test_prefilter.py
- [x] 8. 最後價格、特定價格與 calculate() 入口
  - File: domain/calc/final.py, domain/calc/__init__.py, tests/domain/test_today.py
  - golden 的 calc、sales、marketStats 全部通過。

## Phase 3：法規檢查

- [x] 9. validate 與 selText
  - File: domain/validate/*
  - golden 的 validate 全部通過（訊息逐字相同）。
- [x] 10. domain import 限制測試與清理
  - File: tests/domain/test_domain_imports.py
