# Technology Stack

## Project Type

多事務所共用的 Web Application：一個後端 process 加上一個 SPA 前端。

後端是**單一 Python process**（FastAPI，uvicorn 單一 worker；背景工作由 FastAPI lifespan 管理），同時負責：

1. **HTTP API**：給前端用的 REST API（`/api/v1`）與 SSE 即時推送。
2. **業務邏輯**：案件、流程、身分規則、版本檢查、稽核紀錄。
3. **估價領域**：計算、法規檢查、報告產生（敘述式與摘要式，HTML 預覽與 Word）。
4. **MCP 端點**：給內建 AI 助理和外部 MCP client（例如 Claude Desktop）使用的案件工具。
5. **AI 助理執行**：Claude Agent SDK 驅動的對話。
6. **排程工作**：每月實價登錄同步。
7. **前端靜態檔**：前端 build 成 static files，由同一個 process 提供。

部署單位是一套 stack（`app` + `postgres`）。一套 stack 可以服務多家事務所；事務所之間的隔離在後端的 Service / Repository 層做（見「多事務所隔離」）。

## Core Technologies

### Backend - Python

| 技術 | 版本 | 用途 |
|------|------|------|
| Python | 3.12 | 主要語言 |
| uv | 最新穩定版 | 依賴管理與 lock 檔 |
| FastAPI | 最新穩定版 | 全部 HTTP 端點（REST、SSE、MCP） |
| uvicorn | 最新穩定版 | ASGI server，單一 worker；背景工作由 FastAPI lifespan 管理 |
| SQLAlchemy | 2.x（async） | ORM 與查詢 |
| asyncpg | 最新穩定版 | PostgreSQL async driver |
| Alembic | 最新穩定版 | 資料庫 schema 遷移 |
| Pydantic | 2.x | API schema、案件文件 schema、設定（pydantic-settings） |
| httpx | 最新穩定版 | 唯一的 HTTP client（實價登錄下載等對外請求） |
| python-docx | 最新穩定版 | 產生 Word 報告書 |
| argon2-cffi | 最新穩定版 | 密碼雜湊（argon2id） |
| Authlib | 最新穩定版 | OAuth / OIDC client（外部登入提供者） |
| mcp（官方 Python SDK） | 最新穩定版 | MCP server（Streamable HTTP） |
| claude-agent-sdk | 最新穩定版 | AI 助理的 agent runtime |

### Frontend - React

| 技術 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI |
| TypeScript | 最新穩定版（strict） | 語言 |
| Vite | 最新穩定版 | 開發伺服器與 build |
| pnpm | 最新穩定版 | 套件管理 |
| Tailwind CSS | 4 | 樣式 |
| shadcn/ui | 最新 | UI 元件庫（元件複製進專案，可修改） |
| lucide-react | 最新 | 圖示 |
| TanStack Router | 最新穩定版 | 路由（型別安全的 route 定義） |
| TanStack Query | 5.x | 伺服器資料的讀取、快取、失效 |
| Zustand | 最新穩定版 | 前端本地狀態（工作副本、版面狀態） |
| assistant-ui | 最新穩定版 | AI 對話 UI |
| AG-UI | 最新穩定版 | AI 對話的事件協定（前端 ↔ 後端 agent） |
| Vitest | 最新穩定版 | 前端測試 |

「最新穩定版」指導入時的最新穩定版；實際版本在 `backend/uv.lock` 與 `frontend/pnpm-lock.yaml` 中固定，升級主版本要先讓全部測試通過。

steering 只決定 UI 元件庫。配色、字型和整體外觀由設計稿決定，設計稿放在 `.spec/design/`。

## Application Architecture

```
                 瀏覽器（SPA）                         外部 MCP client
     ┌──────────────────────────────────┐          （例如 Claude Desktop）
     │ 案件內容 │ 對照報告 │ AI 面板     │                   │
     └──────────────────────────────────┘                   │
           │ REST /api/v1   │ SSE   │ AG-UI                 │ MCP
           ▼                ▼       ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                       app（單一 process）                         │
│                                                                  │
│   API 層（FastAPI routers）     MCP 端點       Agent（Claude SDK） │
│        │                          │                 │ 只呼叫 MCP  │
│        └──────────────┬───────────┘◄────────────────┘   案件工具  │
│                       ▼                                          │
│                  Service 層 ── domain（calc / validate / report） │
│                       │                                          │
│                  Repository 層                                    │
│                       │                    jobs（實價登錄排程）    │
│                  Model（SQLAlchemy）                               │
└───────────────────────┬──────────────────────────────────────────┘
                        ▼
                  PostgreSQL 17
```

### 分層

| 層 | 職責 | 不做 |
|----|------|------|
| API（`api/`） | HTTP 輸入輸出、驗證 request、取得目前使用者、把 Service 的錯誤轉成 HTTP 狀態 | 業務規則、直接查資料庫 |
| MCP（`mcp/`） | 把 Service 的操作包成 MCP 工具；工具描述與參數 schema | 業務規則、直接查資料庫 |
| Service（`services/`） | 業務規則：事務所隔離、身分規則、版本檢查、簽名鎖定、稽核紀錄、事件通知 | 依賴 FastAPI、HTTP 型別 |
| Repository（`repositories/`） | 資料存取；每個查詢都帶事務所條件 | 業務判斷、commit |
| Model（`models/`） | SQLAlchemy 資料表定義 | 業務邏輯 |
| Domain（`domain/`） | 純函式：案件 schema、計算、法規檢查、報告產生 | I/O、資料庫、HTTP |

業務邏輯不依賴 web 框架。REST API、MCP 工具和 AI 助理是同一個 Service 層的三種入口，規則只寫一次。

### 計算、檢查、報告只在後端

- 計算、法規檢查（validate）和報告產生只有一個實作，在 `domain/`。前端只顯示結果，不自己計算。
- 計算是純函式：輸入案件、估價模型和實價登錄等參考資料，輸出計算結果。同樣的輸入一定得到同樣的輸出。
- 有一個不寫入的計算端點：輸入一份草稿案件，回傳計算結果、檢查結果和報告區塊。前端用它讓還沒儲存的編輯也能即時看到結果。
- 報告先產生和格式無關的區塊（blocks），再轉成 HTML 預覽或 Word。敘述式與摘要式走同一條路徑，網頁和 MCP 拿到相同的報告。
- 現有的 golden snapshot（示範案件 × 內建模型）是計算正確的標準。從 JavaScript 移植到 Python 時，浮點數的最後幾位可能不同（例如 pow / log 的實作、加總順序），所以比對採用容許誤差：容許誤差由計算的 spec 依數字種類訂定（例如金額到元、比率到固定小數位數），放寬時必須寫出理由。畫面與報告上顯示的數值必須完全相同。
- 任何計算變更都要讓 snapshot 比對通過；snapshot 只有在確定新結果正確時才更新，並在變更說明中寫出原因。

### 案件文件

- 一件案子的內容是**一份 JSON 文件**，存在 JSONB 欄位。理由：計算一次使用整份案件；拆成很多資料表不會帶來好處，只會增加組裝成本。
- 案件文件有 Pydantic schema，所有寫入都先經過 schema 驗證。
- 文件帶有明確的 schema 版本號。讀取舊版本文件時，依序經過升級函式轉成最新版本；每個升級步驟都有測試。
- 流程欄位是資料表的一般欄位：負責人、估價師、階段、狀態、期限、交接留言（內容、留言人、時間）。理由：清單篩選、看板、到期查詢需要用它們過濾和排序。
- 欄位歸位的判準：需要過濾、排序、索引或資料庫約束 → 一般欄位；只有計算和報告會讀、形狀隨標的種類而不同 → 案件文件。

### 多人同時作業

- **有版本的資料**：案件內容、估價模型、事務所設定，每一筆都有版本號。寫入時必須帶上讀到的版本；後端比對，版本不同就回傳衝突，不寫入。版本號由後端產生。
- **流程欄位**：負責人、階段、狀態、期限、交接留言採「後寫入的為準」，而且不改變案件內容的版本號。理由：流程操作很頻繁，不應該讓正在編輯內容的人收到衝突。
- **簽名鎖定**：案件簽名後，後端拒絕任何對案件內容的寫入。簽名時把當時的估價模型複製進案件，之後模型再改也不影響已簽名的案件。
- **即時更新**：資料變更後，後端用 SSE 通知同一事務所中正在看的使用者，前端再重新讀取。不使用輪詢。

### 多事務所隔離

- 事務所（office）是資料層級的組織單位。一位使用者只屬於一個事務所。
- 隔離在 Service / Repository 層做，不使用資料庫的 row-level security。每個讀寫案件、模型、設定、稽核紀錄的 Repository 方法都必須帶事務所條件；沒有「不帶事務所」的查詢路徑。
- 身分規則（appraiser / assistant / manager）在 Service 層判斷，不只在前端隱藏按鈕。
- 隔離與身分規則都由後端測試覆蓋：每個寫入端點至少有一個「別的事務所」和「身分不符」的拒絕案例。
- 實價登錄資料是公開資料，所有事務所共用，不帶事務所欄位。

### 稽核紀錄

- 案件的建立、內容修改、流程變更、簽名、刪除都寫入稽核紀錄（誰、哪個事務所、哪件案子、做了什麼、何時）。
- AI 做的寫入記成「AI 代表某位使用者」：稽核紀錄同時保存那位使用者和 AI 來源。

### AI 助理

- Agent runtime 是 Claude Agent SDK。內建的檔案與 shell 工具全部關閉；它唯一的工具是本後端 MCP 端點上的案件工具。
- Agent 在同一個 app 內呼叫 MCP 工具（process 內或 localhost），不經過外部網路。
- Agent 用一個短期憑證呼叫 MCP 工具。這個憑證綁定它代表的成員，也綁定它被打開時的那件案子；它不能存取其他案件。
- AI 是 Service 層的一個使用者：事務所隔離、它所代表的使用者的身分、版本檢查、簽名鎖定全部照常適用。已簽名的案件對 AI 是唯讀。AI 不能簽名。
- AI 只處理目前打開的那件案子。
- 前端用 assistant-ui 顯示對話，用 AG-UI 接收事件。
- MCP 工具的回傳結果是寫給模型讀的。面板上的動作摘要是另外產生的一句一般語言（例如「新增 4 件比較標的」），不顯示原始參數或原始結果。
- 對話與訊息存在 PostgreSQL，使用者可以重新打開以前的對話。只有正在執行的那一輪對話狀態放在 process 記憶體中。
- 模型 API key 從 `.env` 讀取，一套 stack 一把。
- 外部 MCP client 連到同一個 MCP 端點，使用相同的工具。每個 MCP 呼叫都以某位成員的身分執行，權限規則和網頁相同。

### 排程工作

- 每月的實價登錄同步是 app process 內的排程工作，寫入同一個資料庫的 `lvr_records`，並記錄同步紀錄。
- 單一 worker 保證排程只有一份在跑。排程工作必須可以重複執行而不產生重複資料（以來源資料的識別欄位做 upsert）。

### 單一 process / 單一 worker

以下 3 件事依賴 process 記憶體，所以 app 只跑一個 process、一個 worker：

- SSE 訂閱者清單與事件分送。
- 排程（只能有一份在跑）。
- 正在執行的 AI 對話輪次。

不使用 Redis 或其他訊息中介。如果將來要多個 worker，必須先把這 3 件事改成跨 process 的機制。對話紀錄本身已在 PostgreSQL，不受影響。

## Data Storage

### Primary Database - PostgreSQL 17

所有資料都放在 PostgreSQL：

| 資料 | 說明 |
|------|------|
| 事務所、成員 | 事務所、成員身分、在職狀態 |
| 案件 | 案件文件（JSONB）+ 流程欄位 + 版本號 + 簽名狀態 |
| 估價模型 | 各事務所的模型（JSONB）+ 版本號 |
| 事務所設定 | JSONB + 版本號 |
| 稽核紀錄 | 只新增，不修改、不刪除 |
| 帳號與 session | 成員的登入身分（提供者 + subject id）、密碼雜湊、邀請、session、密碼重設連結、MCP 的 OAuth client 與 token |
| AI 對話 | 對話與訊息（綁定案件與成員） |
| 實價登錄 | `lvr_records`、`lvr_sync_log`（共用） |

- 資料庫 schema 只用 Alembic migration 修改，不手動改資料庫。
- 時間欄位一律 `timestamptz`，在後端用 aware UTC datetime 處理；畫面顯示時轉成台灣時間與民國年。
- JSONB 欄位寫入 Python `None` 時存成 SQL `NULL`，不存成 JSON 的 `null`。
- Session 只活在一個工作單位內（一個 request、一次排程執行）。Repository 不 commit，由 Service 的工作單位統一 commit 或 rollback。

### 案件編號

案件編號依「民國年-流水號」產生（例如 `115-0412`），年份由後端依當下日期計算，在同一事務所內不重複。編號由後端產生，不由前端猜。

## External Integrations

| 對象 | 協定 | 用途 |
|------|------|------|
| 內政部實價登錄（plvr.land.moi.gov.tw） | HTTPS（httpx） | 每月下載公開的實價登錄資料 |
| Anthropic API | HTTPS（Claude Agent SDK） | AI 助理 |
| 外部 MCP client | MCP over HTTP，OAuth 2.1 | 事務所成員用自己的 AI 工具操作案件 |
| SMTP 郵件伺服器 | SMTP | 寄送密碼重設連結與邀請信 |
| 外部登入提供者（Google、Microsoft 365 / Entra ID、Meta） | OIDC / OAuth 2.0（Authlib） | 成員用既有的帳號登入 |

## Development Environment

### 開發、測試、建置都在容器內執行

開發、測試、建置都在容器內執行；主機只需要 podman（或 docker）與 compose。理由：每位開發者和 CI 用同一個環境，結果一致；不需要手動安裝 Python、uv、Node 或 pnpm，也不會因為主機上的版本不同而出錯。

- 開發用 `compose.yaml` 加上 `compose.dev.yaml`：`app`（含 dev 工具，原始碼 bind mount，自動重載）、`postgres`、`web`（Vite dev server）。
- lint、型別檢查、測試、更新 lock 檔，都用 `compose run` 在對應的容器中執行；產生的 lock 檔經 bind mount 寫回原始碼。
- CI 執行和本機相同的 compose 指令，並建置 production image。
- 不使用 Makefile 或只能在特定作業系統上執行的腳本。

### Build & Development Tools

| 工具 | 用途 |
|------|------|
| podman compose（docker compose 也可用） | 開發、測試與部署的唯一入口 |
| uv | 後端依賴（在 `app` 容器內執行） |
| pnpm | 前端依賴（在 `web` 容器內執行） |
| Vite | 前端開發伺服器 + HMR；在 `web` 容器內執行，把 `/api` proxy 到 `app` |
| Alembic | 資料庫 migration |

### Code Quality Tools

| 類型 | 後端（Python） | 前端（TypeScript） |
|------|---------------|-------------------|
| Formatter | Ruff format | Prettier |
| Linter | Ruff、mypy | ESLint |
| Testing | pytest（+ pytest-asyncio） | Vitest |

### 測試原則

- **後端測試一律跑真的 PostgreSQL**，不使用 SQLite。理由：JSONB、時區、約束和並行行為只有在真的 PostgreSQL 上才準。
- **測試前置失敗一律算失敗，不算跳過**。只有「取得資源」（連上資料庫）這一步的失敗可以跳過，而且跳過的理由要能明確列出；取得之後的建表、migration、種資料出錯一律讓測試失敗。
- **計算由 golden snapshot 守住**：snapshot 比對測試涵蓋所有示範案件和內建模型的組合。
- 事務所隔離、身分規則、版本衝突、簽名鎖定都要有後端測試，並且涵蓋 REST 與 MCP 兩種入口。
- 測試名稱與斷言訊息用英文。

### Version Control & Collaboration

- Git，GitHub。主要分支為 `main`。
- 功能在分支上開發，經 pull request 合併。
- commit message 用繁體中文。

## Deployment

### 容器組成（一套 stack）

| 服務 | Image | 說明 |
|------|-------|------|
| `app` | 自建（`Dockerfile` 的 `runtime` target：前端 build → Python runtime） | 後端 API + 業務邏輯 + MCP + AI 助理 + 排程 + 前端 static files |
| `postgres` | `postgres:17` | 主資料庫 |

- 沒有獨立的前端、nginx 或 Redis 容器。
- compose 檔：`compose.yaml`（基本）+ `compose.dev.yaml`（開發覆寫）。podman compose 與 docker compose 都要能用。
- `app` 只對內提供 plain HTTP。TLS 由主機上的反向代理（nginx-proxy）處理，`app` 透過 `VIRTUAL_HOST`、`LETSENCRYPT_HOST` 等環境變數接上。
- 網域與所有部署值都從 `.env` 讀取，不寫死在程式或 compose 檔裡。`.env.example` 提交到 git，列出每個變數和說明；`.env` 不提交。
- app 啟動時執行 Alembic migration 到最新版本。

### Environment Variables（分類）

| 分類 | 例子 | 說明 |
|------|------|------|
| 資料庫 | `DATABASE_URL`、`POSTGRES_PASSWORD` | 連線資訊 |
| 安全 | `SECRET_KEY` | 簽署 session、密碼重設連結與 OAuth 相關資料 |
| AI | `ANTHROPIC_API_KEY` | 一套 stack 一把 |
| 登入提供者 | `AUTH_LOCAL_ENABLED`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`ENTRA_TENANT_ID`、`ENTRA_CLIENT_ID`、`ENTRA_CLIENT_SECRET`、`META_APP_ID`、`META_APP_SECRET` | 哪些提供者啟用與其 client 設定；沒有設定的外部提供者不啟用 |
| 郵件 | `SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASSWORD`、`MAIL_FROM` | 寄送密碼重設與邀請信 |
| 部署 | `VIRTUAL_HOST`、`LETSENCRYPT_HOST`、`PUBLIC_BASE_URL` | 網域與對外網址 |

## Technical Requirements & Constraints

### Performance

- 目標：草稿計算端點對一般案件在 1 秒內回應，讓編輯時的結果能即時更新。
- 案件清單與看板在一個事務所數百件進行中案件時仍可順暢使用。

### Security

- 所有 API 與 MCP 呼叫都要先驗證身分，再依事務所與身分判斷權限。前端隱藏按鈕只是方便，不算權限控制。
- 祕密（API key、資料庫密碼、`SECRET_KEY`、登入提供者的 client secret）只放在 `.env`，不進 git、不進前端 bundle。
- 已簽名案件在伺服器端不可修改。
- 稽核紀錄只新增，不可修改或刪除。

### 身分驗證

細節流程由帳號功能的 spec 決定；以下是原則。

- **帳號與登入方式分開**：帳號就是成員。一位成員可以連結多個登入身分，每個身分是「提供者 + 提供者給的使用者識別（subject id）」。
- **登入提供者可以外掛**：新增一個提供者，只要實作一個提供者介面並加上設定。核心登入流程讀取各提供者的宣告來運作，不為個別提供者寫分支；新增提供者不改核心流程。
- **內建提供者**：
  - 本系統帳號：email + 密碼，密碼用 argon2id 雜湊後儲存。每套 stack 可以關閉這個提供者。
  - Google（OIDC）。
  - Microsoft 365 / Entra ID（OIDC）。
  - Meta（Facebook Login，OAuth 2.0）。
- **哪些提供者啟用**，以及它們的 client id / secret，從各 stack 的 `.env` 讀取。
- **沒有公開註冊**：成員由事務所的估價師或系統管理員邀請，不能自己註冊來建立事務所。第一次用外部提供者登入時，必須對上一份待處理的邀請，或對上一個已連結的身分，才會成功；否則拒絕登入。
- **用 email 連結身分的條件**：只有在提供者聲明這個 email 已驗證時，才可以用 email 自動連結。沒有這個聲明時，成員必須先登入，再手動連結新的身分。未驗證的 email 一律不連結。
- **系統自己的 session**：不論用哪個提供者登入，登入成功後系統都發出自己的伺服器端 session，session 識別放在 HttpOnly cookie。提供者的 token 不當作本系統的 session，也不送到前端。token 不放在 localStorage。
- **前端不認識個別提供者**：前端從後端端點取得已啟用的提供者清單，再由後端開始登入流程。前端不放任何提供者的 SDK。
- **忘記密碼**（本系統帳號）：系統寄出密碼重設連結到使用者的 email。連結有時效，只能用一次。SMTP 設定從 `.env` 讀取。
- **外部 MCP client** 用 OAuth 2.1（authorization code + PKCE，依 MCP authorization 規範）。授權時的登入頁就是網頁版的登入頁，提供相同的登入提供者。每個 token 只代表一位成員。
- **內建 AI 助理**用短期憑證，綁定它代表的成員和目前打開的那件案子（見「AI 助理」）。

### Scalability

- 一套 stack 服務多家事務所，以單一 process 為前提。目標規模是中小型事務所，每家數名到數十名成員。

## Technical Decisions & Rationale

1. **單一 Python 後端，計算移到伺服器**：計算、檢查與報告原本在瀏覽器中，網頁版與本機 MCP 各有一份，報告格式不一致。改成只在後端有一份實作，所有入口結果相同，也讓 AI 能使用。代價是前端預覽要經過 API；用不寫入的草稿計算端點解決。
2. **事務所隔離在 Service 層，不用 RLS**：所有入口（REST、MCP、AI）都經過同一個 Service 層，在這裡統一做隔離與身分判斷，比較容易測試。代價是每個 Repository 查詢都必須帶事務所條件，由測試把關。
3. **案件內容是一份 JSON 文件**：計算一次使用整份案件；用 Pydantic schema 和版本升級補上結構保證。
4. **自己管理資料庫，不使用託管的 BaaS**：權限規則可以放在一般的 Python 程式中測試；部署只需要 compose，一份 `.env` 就能起一套。
5. **SSE 取代輪詢**：即時性較好，請求量較少；只需要伺服器到瀏覽器的單向通知。
6. **不使用 Redis**：單一 process 內就能完成通知與排程，少一個要維運的服務。
7. **AI 透過 MCP 工具操作**：內建 AI 與外部 MCP client 用同一組工具，權限規則只寫一次。
8. **帳號由本系統自己管理，瀏覽器用 HttpOnly cookie session**：不再依賴託管的 Auth 服務；token 不放在瀏覽器的 JavaScript 可讀取的地方，降低被竊取的風險。外部 MCP client 照 MCP 規範用 OAuth 2.1，並沿用同一個登入頁，所以只有一套帳號與一套登入流程。
9. **登入提供者可以外掛，內建 Google、Microsoft 365、Meta**：很多事務所已經在用 Google Workspace 或 Microsoft 365 帳號，讓成員用既有帳號登入可以少記一組密碼。提供者以宣告的方式加入，新增提供者只有一個地方要改，核心登入流程不變。

## Known Limitations

- 單一 process / 單一 worker：水平擴展前要先把 SSE 訂閱者與事件分送、排程、正在執行的 AI 對話輪次改成跨 process 的機制。app 重新啟動時，正在執行的 AI 對話輪次會中斷；已存的對話紀錄不受影響。
- 遷移期間舊版（`core/`、`supabase/` 等）與新版並存；最後一個階段搬移 Supabase 資料並移除舊版。在那之前，舊版的資料仍以 Supabase 為準。
