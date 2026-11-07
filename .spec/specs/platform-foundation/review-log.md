# Review Log — platform-foundation

> 本文件記錄這個功能的審查與決定過程。正式文件（requirements.md / design.md / tasks.md / 程式碼）描述決定之後的樣子；本文件描述為什麼是這個樣子、過程中排除了什麼、哪些原則是刻意放寬的。正式文件中不引用本文件。

---

## 1. Audit Trail

| Round | ID  | Severity | Status | Resolution |
|-------|-----|----------|--------|------------|
| D1 | Bug A | High | fixed | dev 覆寫沿用固定名稱的 proxy network，撞到主機的 local-bridge 與第二份 checkout（已修正於 design.md） |
| D1 | Bug B | High | fixed | 空字串的必要設定通過驗證；CI 的 .env 沒有資料庫密碼（已修正於 design.md） |
| D1 | Bug C | High | fixed | 有 static_dir 時，非 GET 的未知 API 路徑回 405；HEAD 行為未定（已修正於 design.md） |
| D1 | Bug D | High | fixed | T-3 用拒絕連線模擬，驗證不到「沒有回應」的逾時（已修正於 design.md） |
| D1 | Smell E | High | fixed | 沒有 .gitattributes，Windows checkout 的 CRLF 讓 format:check 全部失敗（已修正於 design.md） |
| D1 | Smell F | High | fixed | TestClient 形狀讓 API 寫入無法隔離；需要 async client 與 sessionmaker 層級的替換點（已修正於 design.md） |
| D1 | Bug G | Medium | fixed | web 依賴 app，前端檢查會拉起整個後端（已修正於 design.md） |
| D1 | Smell H | Medium | fixed | 後端依賴同步方式和前端不一致，pull 後 run 會缺套件（已修正於 design.md） |
| D1 | Smell I | Medium | fixed | entrypoint 強制 frozen install，lock 不一致時無法在容器內重新產生（已修正於 design.md） |
| D1 | Smell J | Medium | fixed | rootful docker 在 bind mount 留下 root 擁有的快取（已修正於 design.md） |
| D1 | Smell K | Medium | fixed | R7.2 的名稱防護不可能觸發；殘留測試資料庫沒有處理（已修正於 design.md） |
| D1 | Smell L | Medium | fixed | T-21 依賴測試順序，且暫時資料表會被 rollback（已修正於 design.md） |
| D1 | Smell M | Medium | fixed | Security NFR（非 root、無祕密、無建置工具）沒有測試（已修正於 design.md） |
| D1 | Smell N | Medium | fixed | PROXY_NETWORK 預設值 local-bridge 寫死在 compose（已修正於 design.md） |
| D1 | Smell O | Medium | fixed | uvicorn 未信任反向代理的 forwarded header（已修正於 design.md） |
| D1 | Smell P | Medium | fixed | 連線池未定義資料庫重啟後的行為（已修正於 design.md） |
| D1 | Smell R | Medium | fixed | alembic env.py 的 fileConfig 停用既有 logger，測試結果依順序而變（已修正於 design.md） |
| D1 | Smell Q | Low | fixed | SPA 規則讓含 . 的前端路由失效（已修正於 design.md） |
| D2 | Bug S | High | fixed | uv 的 --frozen 不檢查 lock 是否過期，CI 全綠但正式 image 缺依賴；改用 --locked 並在 CI 加 uv lock --check（已修正於 design.md） |
| D2 | Smell T | Medium | fixed | 測試在 lifespan 啟動後才換 sessionmaker，背景工作拿到原本的；改為建立 app 時注入（已修正於 design.md） |
| D2 | Smell U | Medium | fixed | 「正式密碼必須更換」沒有機制；降級為 README 要求並由 e2e 驗證（已修正於 design.md） |
| D2 | Smell V | Medium | fixed | podman-compose 可能忽略 .env 中的 COMPOSE_FILE；改為明確 -f 或 shell export（已修正於 design.md） |
| D2 | Smell W | Medium | fixed | Settings、compose environment、.env.example 三處靠手動同步；改由 CI 自動比對（已修正於 design.md） |
| D3 | Smell X | Low | fixed | dev image 建置改用 --frozen，讓開發環境在 lock 過期時仍可建置並在容器內修 lock；嚴格檢查留給 runtime 建置與 CI（已修正於 design.md） |
| I1 | Bug A | High | fixed | 後端測試的 ruff 錯誤與格式不合，CI checks 必定失敗（已修正） |
| I1 | Smell B | Medium | fixed | web-dev 每次啟動重新下載 pnpm 原生執行檔（已修正） |
| I1 | Smell C | Medium | fixed | shadcn init 帶入 Geist 字型，提前決定視覺（已修正） |
| I1 | Smell D | Medium | fixed | 測試工具重複（app/client、unused port、手抄 Settings 變數清單）（已修正） |
| I1 | Smell E | Low | fixed | spa.py check_dir=False 的註解與實際行為（500）不符（已修正） |
| I1 | Decision F | Decision | fixed | shadcn 底層 primitives：Base UI 或 Radix（已修正） |
| I1 | Smell G | Low | fixed | postgres healthcheck 只走 socket，初始化期間可能提早回報 healthy；改用 -h 127.0.0.1（已修正） |
| I2 | Smell H | Medium | fixed | design.md 未同步實作審查的修正（assets 檢查、healthcheck、pnpm、測試工具、Radix、前端依賴）；已補（已修正於 design.md / tasks.md） |
| I3 | Smell I | Low | fixed | tasks.md 的 mount_spa 描述未提缺少 assets/ 也會失敗；已補（已修正於 tasks.md） |
| E2E | Bug A | High | fixed | podman 把 exec 形式 healthcheck 中含空白的參數切開，app 永遠不會 healthy（T-29）；改用 CMD-SHELL（已修正於 compose.yaml / design.md） |
| E2E | Smell B | Low | fixed | T-39 的舊版 npm test 需要 python3，node:22-slim 沒有；已修正測試敘述（已修正於 design.md / tasks.md） |

---

## 2. Architecture Decisions

以下決定由主 agent 在審查中做出（advisor 未啟用），等使用者在 Spec Briefing 確認或推翻。

- **A1 compose 拆成三個檔案** `[user-confirmed 2026-11-07 · 要求寫進 README]`（D1 Bug A）
  - 選項：(1) `compose.yaml` + `compose.dev.yaml`，dev 覆寫 proxy network；(2) `.env` 設 `COMPOSE_FILE` 切換；(3) `compose.yaml` 基底 + `compose.override.yaml`（開發，自動合併）+ `compose.prod.yaml`（正式，明確 `-f`）。
  - 決定：(3)。(1) 在主機已有 `local-bridge` 時會撞名或接上真正的反向代理；(2) podman-compose 可能在讀 `.env` 前就決定 compose 檔。代價：正式環境忘記 `-f` 會起 dev stack（只綁 127.0.0.1）。steering 的 compose 檔案組成同步更新。（main agent, 2026-11-07）
- **A2 SPA fallback 用 404 handler，不用 catch-all route** `[user-confirmed 2026-11-07]`（D1 Bug C 修正後的追加決定）
  - catch-all route 會讓既有 API 用錯 method 時回 404 而不是 405。改成「沒有路由對上」時才判斷是否回 `index.html`；保留前綴（api、mcp、healthz、readyz、assets）一律 JSON。（main agent, 2026-11-07）
- **A3 正式環境密碼更換改由 README 要求，不由程式強制** `[main-agent-resolved · pending your review]`（D2 Smell U）
  - 資料庫在正式環境不發布 port；程式強制需要寫死範本密碼字串。（main agent, 2026-11-07）
- **A4 dev image 用 `uv sync --frozen`，嚴格檢查只在 runtime 建置與 CI** `[main-agent-resolved · pending your review]`（D3 Smell X）
  - 讓 lock 過期時開發環境仍可建置並在容器內修 lock。（main agent, 2026-11-07）
- **A5 e2e 驗證步驟放在各 Phase 結束時，由主 agent 執行** `[main-agent-resolved · pending your review]`（tasks 對齊檢查）
  - 不集中到最後一個 Phase；runtime image 內容檢查在 Phase 2 結束時先做，CI 之後重跑。（main agent, 2026-11-07）

- **A6 shadcn/ui 底層用 Radix（new-york），不用 Base UI** `[main-agent-resolved · pending your review]`（I1 Decision F）
  - 選項：(1) 維持 init 預設的 Base UI（base-nova）；(2) 改用 Radix。
  - 決定：(2)。assistant-ui 的 shadcn 元件與大多數第三方範例建立在 Radix 上；目前還沒有產生任何元件，現在切換沒有成本。視覺預設交給 /design。（main agent, 2026-11-07）

---

## 3. Waivers

_(none)_

---

## 4. False Positives

_(none)_

---

## 5. Steering Updates

| #      | Date | Principle | Written to | Source |
|--------|------|------|----------|------|
| SC-1 | 2026-11-07 | 後端端點只放在保留的頂層路徑下；新增頂層路徑要同步加進 RESERVED_PREFIXES | structure.md「API 與路由」 | A2 確認時使用者同意 |
