# Project Structure

## Directory Organization

目標結構如下。新版程式加在舊版旁邊；標示「舊版」的目錄在最後一個階段（搬移 Supabase 資料後）移除，在那之前保持可用。

```
appraisal-report/
├── backend/
│   ├── pyproject.toml              # 後端依賴與工具設定（uv）
│   ├── uv.lock
│   ├── alembic.ini
│   ├── alembic/                    # 資料庫 migration
│   │   └── versions/
│   ├── src/appraisal/              # 後端套件
│   │   ├── main.py                 # 建立 FastAPI app（給 uvicorn 的 factory）、lifespan、掛上 static files
│   │   ├── config.py               # 設定（pydantic-settings，從 .env 讀取）
│   │   ├── db.py                   # engine、session 工作單位
│   │   ├── api/                    # FastAPI routers（/api/v1）、依賴注入、SSE 端點
│   │   ├── services/               # 業務規則：隔離、身分、版本、簽名、稽核、事件
│   │   ├── repositories/           # 資料存取（每個查詢帶事務所條件）
│   │   ├── models/                 # SQLAlchemy 資料表
│   │   ├── schemas/                # API request / response 的 Pydantic 型別
│   │   ├── domain/                 # 純估價領域，不做 I/O
│   │   │   ├── case/               # 案件文件 schema、版本升級、空白案件
│   │   │   ├── calc/               # 比較法、收益法、成本法、土地開發分析、最後價格、地號與稅
│   │   │   ├── validate/           # 法規檢查（必須修正 / 必須說明 / 提醒）
│   │   │   ├── report/             # 報告區塊、敘述式、摘要式、HTML、Word
│   │   │   └── model/              # 估價模型 schema 與內建模型
│   │   ├── auth/                   # 登入提供者介面與宣告
│   │   │   └── providers/          # 內建提供者：local、google、entra、meta（一個提供者一個檔案）
│   │   ├── mcp/                    # MCP server 與案件工具
│   │   ├── agent/                  # Claude Agent SDK 設定、AG-UI 事件轉換
│   │   ├── jobs/                   # 排程工作（實價登錄同步）
│   │   └── data/                   # 隨程式發布的靜態資料（法規條文等）
│   └── tests/
│       ├── conftest.py             # PostgreSQL fixture
│       ├── fixtures/               # 共用 helper 與測試資料
│       ├── golden/                 # 計算 golden snapshot 與示範案件
│       ├── domain/                 # 純函式測試（計算、檢查、報告、schema 升級）
│       ├── services/               # 業務規則測試（隔離、身分、版本、簽名）
│       ├── api/                    # REST 端點測試
│       └── mcp/                    # MCP 工具測試
├── frontend/
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── routes/                 # TanStack Router 路由（檔案即路由）
│       ├── features/               # 依功能分組：cases、case-editor、report、assistant、models、settings
│       ├── components/
│       │   └── ui/                 # shadcn/ui 元件
│       ├── api/                    # API client、TanStack Query hooks、SSE 連線
│       ├── stores/                 # Zustand stores（工作副本、版面）
│       ├── hooks/                  # 跨功能共用 hooks
│       ├── lib/                    # 共用工具（民國年日期、金額格式）
│       └── types/                  # 由後端 OpenAPI 產生的型別
├── compose.yaml                    # 共用基礎：app + postgres
├── compose.override.yaml           # 開發（compose 自動合併）：dev target、bind mount、web
├── compose.prod.yaml               # 正式環境（明確 -f 指定）：反向代理 network、VIRTUAL_*、restart
├── Dockerfile                      # 多個 target：runtime（production）、dev（後端開發與測試）、web-dev（Vite）
├── .env.example                    # 所有環境變數與說明
├── .spec/
│   ├── steering/                   # 本文件與 product.md、tech.md
│   ├── specs/                      # 各功能的 spec
│   └── design/                     # UI 設計稿
│
├── core/                           # 舊版：瀏覽器端核心（最後階段移除）
├── lib/                            # 舊版：Node 執行核心（最後階段移除）
├── mcp/                            # 舊版：本機 MCP 擴充（最後階段移除）
├── tools/                          # 舊版：build 與同步腳本（最後階段移除）
├── test/                           # 舊版：Node 測試；snapshots/ 是移植的 golden 來源（最後階段移除）
├── supabase/                       # 舊版：Supabase SQL（資料搬移後移除）
├── .github/workflows/              # 舊版：實價登錄同步、keepalive（最後階段移除）
└── package.json                    # 舊版 npm 腳本（最後階段移除）
```

## Naming Conventions

### Files

| 類型 | Python（Backend） | TypeScript（Frontend） |
|------|------------------|----------------------|
| 模組 / 檔案 | `snake_case.py`（`case_document.py`） | `camelCase.ts`（`rocDate.ts`） |
| Service | `case_service.py` | - |
| Repository | `case_repository.py` | - |
| API router | `cases.py` | - |
| React 元件 | - | `PascalCase.tsx`（`CaseHeader.tsx`） |
| React hook | - | `useXxx.ts`（`useCaseDraft.ts`） |
| Zustand store | - | `xxxStore.ts`（`draftStore.ts`） |
| 測試檔 | `test_case_service.py` | `CaseHeader.test.tsx` |
| 功能目錄 | `snake_case/` | `kebab-case/`（`case-editor/`） |

### Code

| 類型 | Python | TypeScript |
|------|--------|------------|
| 類別 / 型別 | `PascalCase`（`CaseService`、`CaseDocument`） | `PascalCase`（`CaseSummary`） |
| 函式 | `snake_case`（`calculate_income`） | `camelCase`（`formatRocDate`） |
| 變數 | `snake_case`（`due_date`） | `camelCase`（`dueDate`） |
| 常數 | `UPPER_SNAKE_CASE`（`MAX_HANDOFF_NOTE_LENGTH`） | `UPPER_SNAKE_CASE`（`STAGE_ORDER`） |
| 私有成員 | `_leading_underscore`（`_check_version`） | 不 export 即可 |
| 列舉值（存進資料庫或 API） | 小寫英文字串（`appraiser`、`intake`） | 同左 |

### Database

| 類型 | 規則 | 例子 |
|------|------|------|
| 資料表 | snake_case 複數 | `offices`、`members`、`cases`、`audit_logs`、`lvr_records` |
| 欄位 | snake_case | `office_id`、`due_date`、`handoff_note` |
| 外鍵 | `{單數}_id` | `office_id`、`case_id` |
| 索引 | `ix_{table}_{column}` | `ix_cases_stage` |
| 唯一約束 | `uq_{table}_{column}` | `uq_cases_office_id_case_no` |

### API 與路由

| 類型 | 規則 | 例子 |
|------|------|------|
| REST 路徑 | `/api/v1/` 開頭，資源用 kebab-case 複數 | `/api/v1/cases/{case_id}/handoffs` |
| JSON 欄位（API 外層） | snake_case（與 Python 一致） | `case_no`、`due_date` |
| 案件文件與估價模型內的 key | 沿用現有資料格式的 key（camelCase），Python 端用 snake_case 欄位加 alias 對應 | `modelSnapshot`、`capMode` |
| 前端 route 路徑 | kebab-case | `/cases/$caseId/report` |
| MCP 工具名稱 | `snake_case`，名詞在前 | `case_get`、`comps_add`、`report_docx` |

### 領域用詞

- 程式識別字用英文，沿用現有的領域名稱：`comparison`、`income`、`cost`、`land`、`final`、`parcels`、`comps`、`signed`、`modelSnapshot`。
- 階段代碼：`intake`、`docs`、`survey`、`comps`、`calc`、`decide`、`deliver`。
- 狀態代碼：`active`、`review`、`returned`、`hold`、`cancelled`。
- 身分代碼：`appraiser`、`assistant`、`manager`。
- 畫面上顯示的文字用繁體中文；日期顯示用民國年。

## Import Patterns

### Python（Backend）

```python
# 1. 標準函式庫
from datetime import datetime

# 2. 第三方套件
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

# 3. 本專案：一律從 appraisal 開始的絕對 import
from appraisal.services.case_service import CaseService
from appraisal.domain.calc import calculate
```

### TypeScript（Frontend）

```typescript
// 1. React
import { useState } from 'react'

// 2. 第三方套件
import { useQuery } from '@tanstack/react-query'

// 3. 本專案：用 @/ alias 指向 src
import { Button } from '@/components/ui/button'
import { useCaseDraft } from '@/features/case-editor/useCaseDraft'
```

## Code Structure Patterns

### Backend - 一個請求的路徑

```
router（api/）
  └─ 取得目前使用者（含事務所與身分）
  └─ 呼叫 service 方法，傳入「目前使用者」與輸入
       └─ service：檢查身分規則 → 檢查版本 → 呼叫 domain → 透過 repository 讀寫 → 寫稽核紀錄 → 發出事件
  └─ 把 service 的錯誤轉成 HTTP 狀態（找不到 404、無權限 403、版本衝突 409、驗證失敗 422）
```

- Service 方法的第一個參數是「執行者」（actor）：哪位成員、哪個事務所、什麼身分、是不是 AI 代為執行。所有入口（REST、MCP、AI）都要傳入它。
- Service 丟出領域錯誤（例如版本衝突、無權限），不丟 HTTP 例外。API 層與 MCP 層各自把它轉成自己的錯誤格式。
- 錯誤訊息：給使用者看的檢查訊息用繁體中文並附法條出處；log 訊息用英文。

### Domain

- `domain/` 只有純函式與 Pydantic 型別，不 import `services/`、`repositories/`、`models/`、`api/`、FastAPI 或 SQLAlchemy。
- 計算的輸入輸出都是明確的型別；不讀全域狀態。
- 預設值與合併邏輯只有一份，放在 `domain/case/`。

### Frontend

- 伺服器資料一律透過 `api/` 裡的 TanStack Query hooks 讀寫；元件不直接呼叫 `fetch`。
- 工作副本（還沒確認儲存的編輯）放在 Zustand store，並保存在瀏覽器中，重新整理後還原。
- 前端不實作計算或法規檢查，只呼叫草稿計算端點並顯示結果。
- shadcn/ui 元件放在 `components/ui/`；功能專用元件放在各自的 `features/` 目錄。

## Module Boundaries

```
Frontend:  routes ─► features ─► components / hooks / stores ─► api ──► HTTP / SSE / AG-UI
                                                                          │
Backend:   api ─────┐                                                     ▼
           mcp ─────┼──► services ──► repositories ──► models ──► PostgreSQL
           agent ─► mcp      │
           jobs ────┘        └──► domain（純函式）
```

### 依賴方向

| 來源 | 可依賴 | 不可依賴 |
|------|--------|---------|
| `api/` | `services/`、`schemas/`、`domain/` 的型別 | `repositories/`、`models/` |
| `mcp/` | `services/`、`domain/` 的型別 | `repositories/`、`models/`、`api/` |
| `agent/` | `mcp/`（只透過 MCP 工具）、`config` | `services/` 直接呼叫、`repositories/` |
| `jobs/` | `services/`、`repositories/` | `api/`、`mcp/` |
| `auth/` | `config`、OAuth / OIDC client 函式庫 | `api/`、`services/`、`repositories/`（身分連結與 session 由 `services/` 處理） |
| `services/` | `repositories/`、`models/`、`domain/`、`schemas/`、`auth/` | `api/`、`mcp/`、FastAPI |
| `repositories/` | `models/` | `services/`、`api/` |
| `domain/` | 標準函式庫、Pydantic | 其他任何 `appraisal` 子套件 |
| 前端 UI（routes / features / components） | `api/`、`stores/`、`hooks/`、`lib/` | 直接發網路請求 |
| 前端 `api/` | `types/`、`lib/` | UI 層 |

### 新舊版界線

- 新版（`backend/`、`frontend/`）不 import、不讀取舊版目錄的程式碼。
- 移植時以舊版程式碼和 `test/snapshots/` 為參考，把 golden 資料複製到 `backend/tests/golden/`；新版不在執行時依賴舊版檔案。
- 舊版在最後一個階段一次移除，不分批刪。

## Code Size Guidelines

| 類型 | 建議上限 | 說明 |
|------|---------|------|
| 檔案 | 300 行 | 超過就依職責拆分；計算與報告依估價方法或報告段落分檔 |
| 函式 | 50 行 | 保持單一職責 |
| 巢狀深度 | 4 層 | 過深要重構 |
| React 元件 JSX | 100 行 | 複雜畫面拆成子元件 |

## Documentation Standards

- 程式碼註解、docstring、說明文件、README 用繁體中文；識別字、log 訊息、測試名稱和斷言訊息用英文。
- 計算與法規檢查的程式碼，在註解中寫出依據的法條或公報（例如「技術規則 §25」）。
- Service 的公開方法寫 docstring，說明它檢查哪些規則、可能丟出哪些錯誤。
- 程式碼與註解不引用 spec 文件或內部討論紀錄。
