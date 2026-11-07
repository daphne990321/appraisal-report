# Tasks Document

## Task Status Markers

| Marker | Meaning | Description |
|------|------|------|
| `[ ]` | To do | Task not yet started |
| `[x]` | Done | Implemented and verified to pass |
| `[~]` | Needs rework | Affected by a design change, needs reimplementation |
| `[-]` | Removed | Removed by a design change, code already cleaned up |

## 執行說明

- 同一個 Phase 中，`File:` 互不重疊的任務可以同時執行；測試任務和同一個 Phase 的實作任務同時進行。
- 所有指令都在容器中執行，主機不安裝 Python、uv、Node 或 pnpm。Phase 1 還沒有 dev image 時，用一次性的官方容器產生 lock 檔（見各任務說明）。
- 每個 Phase 在全部任務完成後才建置與檢查；同一個 Phase 中的檔案可以互相 import。
- 驗證任務（e2e 案例）放在它需要的東西全部存在的第一個 Phase 最後；驗證任務沒有 `File:`，由主要負責人依步驟執行並記錄結果，不寫測試程式。

---

## Phase 1: 專案骨架與容器基礎

同一個 Phase 中的檔案可以互相 import，所以任務可以同時撰寫；這個 Phase 在全部任務完成後才建置與檢查。

- [x] 1. 後端專案設定與 lock 檔
  - File: backend/pyproject.toml, backend/uv.lock, backend/src/appraisal/__init__.py
  - 建立 `pyproject.toml`：hatchling build backend、src layout、依賴與 dev 群組、ruff（規則清單、`line-length = 100`、first-party `appraisal`）、mypy strict（含 pydantic plugin，檢查 `src`、`tests`、`scripts`）、pytest（`testpaths`、asyncio 設定）。
  - `uv.lock` 在一次性的容器中產生：`podman run --rm -v ./backend:/app -w /app ghcr.io/astral-sh/uv:<與 Dockerfile 相同的版本>-python3.12-bookworm-slim uv lock`。之後的更新用 `podman compose run --rm app uv lock`。
  - `__init__.py` 只有套件說明註解。
  - Purpose: 讓 dev 與 runtime image 可以建置，並固定後端依賴版本。
  - Design ref: 後端專案設定（`backend/pyproject.toml`）；檔案清單
  - _Leverage: 無_
  - _Requirements: R5.1, R6.1, R6.3_

- [x] 2. 前端專案骨架與 lock 檔
  - File: frontend/package.json, frontend/pnpm-lock.yaml, frontend/index.html, frontend/vite.config.ts, frontend/tsconfig.json, frontend/tsconfig.app.json, frontend/tsconfig.node.json, frontend/components.json, frontend/eslint.config.js, frontend/.prettierrc, frontend/.prettierignore, frontend/src/main.tsx, frontend/src/index.css, frontend/src/routes/__root.tsx, frontend/src/routes/index.tsx, frontend/src/routeTree.gen.ts, frontend/src/lib/utils.ts, frontend/src/components/ui/.gitkeep
  - 依 design 建立 Vite + React 19 + TS strict + Tailwind 4 + TanStack Router（檔案路由）+ TanStack Query 的骨架；`package.json` 的 `packageManager` 固定 pnpm 版本；scripts 依 design 的表格。
  - `vite.config.ts`：plugin 順序、`@` alias、dev server（`0.0.0.0:5173`、proxy `/api` 與 `/mcp`、`DEV_USE_POLLING`、`DEV_HMR_CLIENT_PORT`）、Vitest 設定（jsdom、`setupFiles: ['src/test/setup.ts']`）。
  - `tsconfig.*.json` 的 `tsBuildInfoFile` 指向 `node_modules/.tmp/`。
  - shadcn/ui 用 `pnpm dlx shadcn@latest init` 初始化（產生 `components.json`、`src/lib/utils.ts`、`src/index.css` 的 CSS 變數），style `radix-nova`；不選字型與視覺 preset，neutral 的 CSS 變數只是佔位；不加入 `@base-ui/react` 與字型套件。
  - 佔位首頁 `src/routes/index.tsx` 顯示「不動產估價報告系統」與「新版建置中」。
  - `pnpm-lock.yaml` 與 `routeTree.gen.ts` 在一次性的容器中產生：`podman run --rm -v ./frontend:/app -w /app node:22-slim sh -c "corepack enable && pnpm install && pnpm exec vite build && pnpm build"`。`routeTree.gen.ts` 還不存在時 `pnpm build` 的 `tsc -b` 會因為 `main.tsx` import 它而失敗，所以先執行 `vite build`：它不做型別檢查，而 router plugin 在建置開始時產生 `routeTree.gen.ts`；之後的 `pnpm build` 確認型別檢查與建置都通過。不用 `tsr generate`，因為它需要另外加入 `@tanstack/router-cli` 依賴，而 plugin 和開發與正式建置使用同一個產生器；完成後刪除容器產生的 `frontend/node_modules` 與 `frontend/dist`。之後的更新用 `podman compose run --rm web ...`。
  - `routeTree.gen.ts` 列在 `.prettierignore` 與 ESLint 忽略清單中。
  - Purpose: 讓 `web-dev` 與 `web-build` 可以建置，並提供佔位首頁。
  - Design ref: 前端骨架（`frontend/`）；檔案清單
  - _Leverage: 無_
  - _Requirements: R4.6, R5.3, R5.4, R5.6, R6.2, R6.6_

- [x] 3. Dockerfile 與 `.dockerignore`
  - File: Dockerfile, .dockerignore
  - `Dockerfile`：開發用的 `web-base`、`web-dev`、`py-base`、`dev`，包含開發用 entrypoint 與 dev 的快取環境變數。uv image 固定版本。正式環境的 `py-build`、`web-build`、`runtime` 由 Phase 2 的任務加在這個檔案最後。
  - `.dockerignore` 依 design 的排除清單。
  - Purpose: 開發環境的 image。
  - Design ref: Dockerfile；`.dockerignore`；容器內的目錄配置
  - _Leverage: 無_
  - _Requirements: R5.1, R6.5, R6.6_

- [x] 4. compose 檔案
  - File: compose.yaml, compose.override.yaml, compose.prod.yaml
  - `compose.yaml`（共用基礎）、`compose.prod.yaml`（正式環境）、`compose.override.yaml`（開發）依 design 的三張表；`app.environment` 逐一列出 Settings 的變數（不含 `STATIC_DIR`）。
  - Purpose: 提供開發與正式環境的服務設定。
  - Design ref: compose 檔案的分工；`compose.yaml`（共用基礎）；`compose.prod.yaml`（正式環境）；`compose.override.yaml`（開發）；Data Models（其他環境變數）
  - _Leverage: 無_
  - _Requirements: R1.1, R1.5, R1.6, R1.7, R2.4, R5.2, R5.5, R5.6, R5.7, R6.4, NFR-S3, NFR-R3, NFR-U1_

- [x] 5. 設定範本
  - File: .env.example
  - 全部變數與說明；開發用密碼標示「只供開發使用」；`STATIC_DIR` 標示「只在容器以外執行時使用，compose 不會傳給 `app`」；正式環境專用的變數放在獨立的註解段落。
  - Purpose: 部署者與開發者知道每一個變數的用途，複製成 `.env` 後就能啟動開發環境。
  - Design ref: `.env.example`；Data Models（Settings 欄位、其他環境變數）
  - _Leverage: 無_
  - _Requirements: R1.5, R3.3, NFR-S2, NFR-S5_

- [x] 6. 版本控制設定
  - File: .gitignore, .gitattributes
  - `.gitignore` 在最後新增 `!.env.example`、`__pycache__/`、`.pytest_cache/`、`.mypy_cache/`、`.ruff_cache/`，原有規則不動。
  - 新增 `.gitattributes`，只涵蓋新版路徑；不執行 `git add --renormalize`。
  - Purpose: `.env.example` 能提交；新版檔案固定 LF；舊版檔案不受影響。
  - Design ref: `.gitignore` 補充；`.gitattributes`
  - _Leverage: 根目錄現有的 `.gitignore`_
  - _Requirements: R3.3, R10.1, R10.3_

- [x] 7. 前端冒煙測試
  - File: frontend/src/test/setup.ts, frontend/src/test/home.test.tsx
  - `setup.ts` 載入 Testing Library 的 jest-dom matcher；`home.test.tsx` render 首頁 route 元件並確認標題。
  - Cases: T-26
  - Design ref: Testing Strategy；前端骨架（`frontend/`）

- [x] 8. 驗證：compose 設定、依賴同步與換行字元
  - 驗證任務沒有 `File:`，由主要負責人依步驟執行並記錄結果，不寫測試程式。
  - 檢查正式設定（`-f compose.yaml -f compose.prod.yaml`）與開發設定（不加 `-f`）展開後的 network、port 與環境變數，拿掉 `PROXY_NETWORK` 確認 compose 失敗；透過 compose 新增一個後端與一個前端依賴；只改 `pyproject.toml` 後確認依賴同步警告與 `uv lock` 仍可執行；在 Windows（`core.autocrlf=true`）checkout 後執行格式檢查並確認舊版檔案沒有變更。
  - T-36 與 T-46 的後端步驟用 `podman compose run --rm app <指令>`（entrypoint 會先同步依賴），不用 `up`：`app` 的預設 command（`appraisal.startup`）在 Phase 3 才存在。
  - Cases: T-28, T-36, T-44, T-46
  - Design ref: Testing Strategy；compose 檔案的分工；Dockerfile（開發用 entrypoint）；`.gitattributes`

---

## Phase 2: 後端基礎（設定、資料庫、logging、migration）

同一個 Phase 中的檔案可以互相 import，所以任務可以同時撰寫；這個 Phase 在全部任務完成後才建置與檢查。

- [x] 1. 設定與 logging
  - File: backend/src/appraisal/config.py, backend/src/appraisal/log.py
  - `Settings`（欄位依 Data Models，`env_file=None`、`case_sensitive=False`、`env_ignore_empty=True`）、`database_url()`、`SettingsError`、`get_settings()`（lru_cache，ValidationError 轉成列出變數名稱的 `SettingsError`）。
  - `configure_logging(level)`：root handler 與格式，root 與 `appraisal` logger 的等級，重複呼叫不增加 handler。
  - Purpose: 所有元件共用的設定與 logging。
  - Design ref: Settings（`appraisal/config.py`）；Logging（`appraisal/log.py`）；Data Models（Settings 欄位）
  - _Leverage: 無_
  - _Requirements: R3.1, R3.2, R3.4, NFR-U2_

- [x] 2. 資料庫基礎
  - File: backend/src/appraisal/db.py, backend/src/appraisal/models/__init__.py
  - `db.py`：`NAMING_CONVENTION`、`metadata`、`Base`、`create_engine()`（`pool_pre_ping=True`）、`create_sessionmaker()`（`expire_on_commit=False`）。
  - `models/__init__.py`：model 的登記處，本段為空。
  - Purpose: 後面各段加入資料表的基礎，以及唯一的 engine 與 sessionmaker 建立方式。
  - Design ref: 資料庫基礎（`appraisal/db.py`）；Data Models（NAMING_CONVENTION）
  - _Leverage: 本 Phase 任務 1 的 `config`_
  - _Requirements: R8.1, R8.2, R11.2_

- [x] 3. Migration 與 baseline
  - File: backend/src/appraisal/migrations.py, backend/alembic.ini, backend/alembic/env.py, backend/alembic/script.py.mako, backend/alembic/versions/0001_baseline.py
  - `migrations.py`：`BACKEND_ROOT`、`alembic_config()`、`upgrade_to_head()`、`downgrade_to_base()`。
  - `alembic.ini` 不含連線網址與 logger 段落；`env.py` 用 `asyncio.run()`、連線網址順序依 design、不呼叫 `fileConfig`、匯入 `appraisal.models`。
  - `0001_baseline.py`：`revision = "0001"`、`down_revision = None`，`upgrade()` 與 `downgrade()` 都不做事。
  - Purpose: 啟動程序與測試用同一種方式執行 migration；後面各段的 revision 接在 baseline 之後。
  - Design ref: Migration 輔助（`appraisal/migrations.py`）；Alembic baseline（`backend/alembic/versions/0001_baseline.py`）
  - _Leverage: 本 Phase 任務 1 的 `config`、任務 2 的 `db` 與 `models`_
  - _Requirements: R1.2, R7.5, NFR-R2_

- [x] 4. 正式環境 image targets
  - File: Dockerfile
  - 在 Phase 1 建立的 `Dockerfile` 最後加入 `py-build`、`web-build`、`runtime`（最後，預設 target）；不改 Phase 1 的 target。`runtime` 包含非 root 使用者、`STATIC_DIR=/app/static`，並複製 `backend/alembic.ini` 與 `backend/alembic/`，所以放在 alembic 檔案存在的這個 Phase。
  - Purpose: 正式環境的 image。
  - Design ref: Dockerfile；容器內的目錄配置
  - _Leverage: Phase 1 的 `Dockerfile`（`web-base`、`py-base`）_
  - _Requirements: R1.1, NFR-S1, NFR-S2, NFR-S4_

- [x] 5. 測試基礎與資料庫測試
  - File: backend/tests/__init__.py, backend/tests/conftest.py, backend/tests/fixtures/__init__.py, backend/tests/fixtures/app_client.py, backend/tests/fixtures/database.py, backend/tests/fixtures/network.py, backend/tests/test_migrations.py, backend/tests/test_isolation.py
  - `create_test_database()` 與 `conftest.py` 的全部 fixture（`base_settings`、`test_settings`、`engine`、`db_connection`、`sessionmaker`、`db_session`、`running_app`、`app`、`client`）；`open_running_app()` 與 `RunningApp`（`app_client.py`）；`unused_local_port()` 與 `unresponsive_listener()`（`network.py`）。`open_running_app()` 在函式內部才 import `create_app`，讓這個 Phase 的測試不依賴 Phase 3 的程式碼。
  - 沒有任何 `pytest.skip`。
  - Cases: T-10, T-11, T-19, T-21, T-22, T-48, T-56, T-57
  - _Requirements: R7.1, R7.2, R7.3, R7.4_
  - Design ref: Testing Strategy；測試資料庫與共用 fixture（`backend/tests/fixtures/`、`backend/tests/conftest.py`）

- [x] 6. 設定、命名慣例與 logging 測試
  - File: backend/tests/test_config.py, backend/tests/test_naming.py, backend/tests/test_logging.py, backend/tests/fixtures/settings_environment.py
  - Cases: T-4, T-5, T-23, T-24, T-25, T-54, T-55
  - Design ref: Testing Strategy

- [x] 7. 驗證：正式環境 image
  - 驗證任務沒有 `File:`，由主要負責人依步驟執行並記錄結果，不寫測試程式。
  - `podman build --target runtime -t appraisal:local .`，再依 CI `image` job 的檢查項目檢查 image 內容。CI 的 `image` job 之後每次重新執行同樣的檢查。
  - Cases: T-45
  - Design ref: Testing Strategy；Dockerfile；CI（`.github/workflows/app-ci.yml`）

---

## Phase 3: 應用程式、SPA 與啟動程序

本 Phase 的實作任務 1 到 4 互相 import（`main.py` 註冊 `health`、`v1` 與 `spa`），可以同時撰寫；這個 Phase 在全部任務完成後才建置與檢查。

- [x] 1. Application factory 與 session dependency
  - File: backend/src/appraisal/main.py, backend/src/appraisal/api/__init__.py, backend/src/appraisal/api/deps.py
  - `create_app(settings=None, *, sessionmaker=None)`、lifespan（engine 一定建立；sessionmaker 用傳入的或新建的）、路由註冊順序（`static_dir` 有值時才呼叫 `mount_spa`）、`configure_logging`。
  - `get_db_session`：從 `request.app.state.sessionmaker` 取得 session，不 commit。
  - Purpose: 後面各段掛載端點與背景工作的地方；所有程式共用的 session 來源。
  - Design ref: Application factory（`appraisal/main.py`）；資料庫 session dependency（`appraisal/api/deps.py`）
  - _Leverage: Phase 2 的 `config`、`db`、`log`；本 Phase 任務 2 到 4 的 `health`、`v1`、`spa`_
  - _Requirements: R4.5, R4.8, R11.2_

- [x] 2. 健康檢查
  - File: backend/src/appraisal/api/health.py
  - `/healthz`（不碰資料庫）、`/readyz`（`READINESS_TIMEOUT_SECONDS = 2.0`，透過 `app.state.engine`，503 不含細節，WARNING log）。
  - Purpose: 讓容器管理工具與監控分辨「程式停了」和「資料庫連不上」。
  - Design ref: 健康檢查（`appraisal/api/health.py`）
  - _Leverage: 無_
  - _Requirements: R2.1, R2.2, R2.3, NFR-P1, NFR-P2_

- [x] 3. API v1 router
  - File: backend/src/appraisal/api/v1.py
  - `router = APIRouter(prefix="/api/v1")`，本段沒有端點。
  - Purpose: 後面各段加入 API 端點的位置。
  - Design ref: API v1 router（`appraisal/api/v1.py`）
  - _Leverage: 無_
  - _Requirements: R11.1_

- [x] 4. SPA 靜態檔與 404 handler
  - File: backend/src/appraisal/api/spa.py
  - `mount_spa(app, static_dir)`：`static_dir` 中沒有 `index.html` 或沒有 `assets/` 目錄時丟出 `RuntimeError`，讓 `create_app()` 與整個啟動失敗；掛載 `/assets`（immutable cache）、註冊 404 handler（判斷順序依 design；其他狀態碼交給 FastAPI 預設 handler；HEAD 沒有 body；路徑不能離開 `static_dir`）。
  - Purpose: 提供前端並保留 API 的 404 與 405 行為。
  - Design ref: SPA 靜態檔（`appraisal/api/spa.py`）；請求路由
  - _Leverage: 無_
  - _Requirements: R4.1, R4.2, R4.3, R4.4, R4.7, R4.8, R4.9_

- [x] 5. 啟動程序
  - File: backend/src/appraisal/startup.py
  - `main(argv)`：設定（結束碼 2）→ logging → 等待資料庫（`CONNECT_ATTEMPT_TIMEOUT_SECONDS = 5`、間隔 2 秒、`startup_db_wait_seconds`，結束碼 3）→ `upgrade_to_head`（結束碼 4）→ `os.execvp` uvicorn（含 `--forwarded-allow-ips` 與額外參數）。log 不含連線網址；註解說明多個 replica 時的 advisory lock。
  - Purpose: 容器的啟動流程。
  - Design ref: 啟動程序（`appraisal/startup.py`）
  - _Leverage: Phase 2 的 `config`、`db`、`log`、`migrations`_
  - _Requirements: R1.1, R1.2, R1.3, R1.4, R1.7, R3.2, R3.4, NFR-P3, NFR-R1_

- [x] 6. 健康檢查、API 擴充點與 session 來源測試
  - File: backend/tests/test_health.py, backend/tests/test_api_v1.py, backend/tests/test_app_sessions.py
  - Cases: T-1, T-2, T-3, T-42, T-43, T-53
  - Design ref: Testing Strategy

- [x] 7. SPA 測試
  - File: backend/tests/test_spa.py
  - Cases: T-12, T-13, T-14, T-15, T-16, T-17, T-18
  - Design ref: Testing Strategy

- [x] 8. 啟動程序測試
  - File: backend/tests/test_startup.py
  - Cases: T-6, T-7, T-8, T-9
  - Design ref: Testing Strategy

- [x] 9. 驗證：開發環境與正式環境
  - 驗證任務沒有 `File:`，由主要負責人依步驟執行並記錄結果，不寫測試程式。
  - 開發環境：只有 podman 與 compose 的主機上 `cp .env.example .env` 後 `podman compose up --build`；檢查重新載入、HMR、proxy、port 綁定、兩份工作目錄同時執行（主機已有 `local-bridge`）、`DEV_USE_POLLING`；比對一次完整後端測試前後的主要資料庫。
  - 正式環境：用 `compose.yaml` + `compose.prod.yaml` 起一套服務，檢查 migration、`/readyz`、深層路徑、健康狀態；量測 `/healthz` 的回應時間；讓 `app` 的主程序異常結束，確認容器自動重新啟動；經過反向代理請求多一個斜線的 `/healthz/`，確認轉址網址是對外的 https 網址。
  - Cases: T-27, T-29, T-30, T-31, T-32, T-33, T-34, T-41, T-50, T-51, T-52
  - Design ref: Testing Strategy；`compose.override.yaml`（開發）；`compose.prod.yaml`（正式環境）；測試資料庫

---

## Phase 4: CI 與文件

同一個 Phase 中的檔案可以互相 import，所以任務可以同時撰寫；這個 Phase 在全部任務完成後才建置與檢查。

- [x] 1. 設定一致性檢查腳本
  - File: backend/scripts/check_env_contract.py
  - 從 stdin 讀入 `compose.yaml` 展開後的 JSON，讀取 `--env-example` 指定的檔案，和 `Settings.model_fields` 比對；規則依 design；不符時列出名稱並以結束碼 1 結束。
  - Purpose: 新增設定時，Settings、compose 與 `.env.example` 不會不一致。
  - Design ref: CI（`.github/workflows/app-ci.yml`）的設定一致性檢查
  - _Leverage: Phase 2 的 `Settings`_
  - _Requirements: R3.3_

- [x] 2. CI workflow
  - File: .github/workflows/app-ci.yml
  - 觸發與 `paths`；job `checks`（`.env` 隨機密碼、compose config、build、`uv lock --check`、後端檢查與測試、設定一致性、前端檢查與測試、`down -v`）；job `image`（`runtime` 建置與 image 內容檢查）。
  - Purpose: pull request 自動執行和本機相同的檢查。
  - Design ref: CI（`.github/workflows/app-ci.yml`）
  - _Leverage: 無_
  - _Requirements: R9.1, R9.2, R9.3, R9.4_

- [x] 3. README 新版一節
  - File: README.md
  - 依 design 的大綱新增「新版（開發中）」一節，放在現有內容之前；原有內容不變。
  - Purpose: 上游審查者與開發者知道怎麼執行新版。
  - Design ref: README 新版一節
  - _Leverage: 現有的 README.md_
  - _Requirements: R10.1, R10.2, R6.1, R6.2, R6.3, NFR-S5, NFR-U1, NFR-U2_

- [ ] 4. 驗證：開發者指令、CI、舊版與文件
  - 驗證任務沒有 `File:`，由主要負責人依步驟執行並記錄結果，不寫測試程式。
  - 執行 README 的全部檢查與測試指令，確認 `git status` 沒有快取檔；在 pull request 上確認 CI 兩個 job 通過，image 內容檢查（CI 重新執行 T-45）與設定一致性檢查通過；故意讓一項檢查失敗、讓 `uv.lock` 過期、新增一個沒有登記的 Settings 欄位，確認 CI 失敗；確認舊版檔案與現有 workflow 沒有變更、舊版 `npm test` 在加裝 `python3` 的 `node:22-slim` 容器中通過；檢查 `.env.example` 與 README。
  - 最後用 docker compose 重做 T-30 到 T-36。
  - Cases: T-35, T-38, T-39, T-40, T-47, T-49, T-37
  - Design ref: Testing Strategy；CI（`.github/workflows/app-ci.yml`）；README 新版一節
