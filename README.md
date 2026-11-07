# 新版（開發中）

新版是 FastAPI + PostgreSQL 後端與 React 前端，全部在容器中開發、測試與部署。下面的說明只適用於新版（`backend/`、`frontend/`、`Dockerfile`、`compose*.yaml`）；舊版的說明在這一節之後。

## 主機需求

只需要 podman（或 docker）與 compose。主機不用安裝 Python、uv、Node 或 pnpm。

下面的指令都用 `podman`；使用 docker 的人把 `podman` 換成 `docker`。

## 第一次啟動

```sh
cp .env.example .env
podman compose up --build
```

- 前端：http://127.0.0.1:5173
- API：http://127.0.0.1:8000（`/healthz`、`/readyz`）

`.env.example` 裡的資料庫密碼只供開發使用，複製後不用修改就能啟動。服務只發布在 127.0.0.1。

主機的 5432 port 已經被占用時，在 `.env` 設定 `POSTGRES_HOST_PORT`（見「同時執行兩份工作目錄」）。

停止服務：`podman compose down`。資料庫資料放在 named volume；`podman compose down -v` 會一併刪除它。

## 常用指令

這些指令都不加 `-f`：compose 會自動合併 `compose.override.yaml`，使用開發設定。

| 用途 | 指令 |
| --- | --- |
| 後端測試 | `podman compose run --rm app pytest` |
| 後端 lint | `podman compose run --rm app ruff check .` |
| 後端格式檢查 | `podman compose run --rm app ruff format --check .` |
| 後端格式化 | `podman compose run --rm app ruff format .` |
| 後端型別檢查 | `podman compose run --rm app mypy` |
| lock 檔是否過期 | `podman compose run --rm app uv lock --check` |
| 前端 lint | `podman compose run --rm web pnpm lint` |
| 前端型別檢查 | `podman compose run --rm web pnpm typecheck` |
| 前端測試 | `podman compose run --rm web pnpm test` |
| 前端格式檢查 | `podman compose run --rm web pnpm format:check` |
| 前端格式化 | `podman compose run --rm web pnpm format` |

後端測試會在同一個 `postgres` 服務上建立一次性的資料庫，不會動到主要資料庫。

## 依賴與 lock 檔

新增依賴：

```sh
podman compose run --rm app uv add <pkg>
podman compose run --rm web pnpm add <pkg>
```

手動改了 `backend/pyproject.toml` 或 `frontend/package.json` 之後，重新產生 lock 檔：

```sh
podman compose run --rm app uv lock
podman compose run --rm web pnpm install
```

容器每次啟動都會先依 lock 檔同步依賴。如果看到下面的警告，表示 lock 檔和依賴宣告不一致，依賴可能不是最新的；執行上面的指令重新產生 lock 檔即可。

```text
WARNING: dependency sync failed; dependencies may be out of date. Regenerate the lock file.
```

CI 會用 `uv lock --check` 檢查後端的 lock 檔，lock 檔過期時 CI 失敗。

工具版本固定在 `Dockerfile` 與 `frontend/package.json`：uv 0.9.30、pnpm 12.18、node 22。

## 檔案變更偵測不到時

檔案放在虛擬機或網路磁碟上時，容器可能收不到檔案變更的通知。在 `.env` 設定 `DEV_USE_POLLING=1`，Vite 與 uvicorn reload 會改用輪詢偵測。

## 同時執行兩份工作目錄

兩份工作目錄的主機 port 不能相同，在其中一份的 `.env` 修改：

```sh
APP_HOST_PORT=8100
WEB_HOST_PORT=5273
POSTGRES_HOST_PORT=5532
```

compose 用目錄名稱區分兩份服務。目錄名稱相同時，在 `.env` 設定不同的 `COMPOSE_PROJECT_NAME`。

## 測試留下的資料庫

中斷的測試可能留下名稱含 `_test_` 的資料庫。列出它們：

```sh
podman compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
SELECT datname FROM pg_database WHERE datname LIKE '%\_test\_%';
SQL
```

刪除其中一個（`<name>` 換成上面列出的名稱）：

```sh
podman compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
DROP DATABASE <name> WITH (FORCE);
SQL
```

刪除前先確認沒有其他測試正在執行；執行中的測試用的資料庫也符合這個名稱。

## SELinux 與檔案擁有者

- **SELinux**：專案的 compose 檔沒有在 bind mount 加 `:Z` 或 `:z`。在啟用 SELinux 的主機上，如果容器讀不到掛載的目錄，自己在 `compose.override.yaml` 的 `volumes` 加上 `:Z`。
- **檔案擁有者**：`uv add`、`uv lock`、`pnpm add`、`pnpm install` 會把 lock 檔與依賴宣告寫回工作目錄。rootless podman 與 Docker Desktop 會把容器內的 root 對應到你的使用者，不會有問題。Linux 上的 rootful docker 會寫出 root 擁有的檔案，用 `sudo chown -R "$USER": backend frontend` 改回來。

## 正式部署

> **警告：`POSTGRES_PASSWORD` 一定要換成隨機的長密碼。`.env.example` 中的值只供開發使用。**

正式環境的指令一律明確指定兩個檔案；有 `-f` 時 compose 不會讀取 `compose.override.yaml`：

```sh
podman compose -f compose.yaml -f compose.prod.yaml up -d --build
podman compose -f compose.yaml -f compose.prod.yaml logs -f app
podman compose -f compose.yaml -f compose.prod.yaml down
```

`.env` 必須設定下面三個值，缺少時 compose 直接報錯：

```sh
# 主機反向代理（nginx-proxy + acme-companion）的 network 名稱
PROXY_NETWORK=proxy
# 對外網域
VIRTUAL_HOST=report.example.com
LETSENCRYPT_HOST=report.example.com
```

`app` 不發布 port，只透過 `PROXY_NETWORK` 這個 network 讓反向代理連到它；TLS 由反向代理處理。

選用：在伺服器 shell 的 profile 中設定 `COMPOSE_FILE`，就不用每次都寫 `-f`（Windows 用 `;` 分隔）：

```sh
export COMPOSE_FILE=compose.yaml:compose.prod.yaml
```

### 過渡期的舊版入口 `/legacy/`

新版畫面完成前，正式 image 在建置時用 `tools/build.py` 產生舊版單頁，放在 `https://<網域>/legacy/`。舊版照常直接連 Supabase，資料不會搬到新資料庫。

- **Supabase 設定**：舊版重設密碼信的連結會回到目前網址，所以要在 Supabase 後台 Authentication → URL Configuration → Redirect URLs 加入 `https://<網域>/legacy/`，否則重設密碼會失敗。
- **瀏覽器裡的草稿**：舊版把還沒上傳的草稿存在瀏覽器裡，而且這些資料綁在網址上。從舊網址改到 `/legacy/` 的使用者，要先在舊網址匯出案件檔，再到新網址匯入。

---

# 估價報告產生器 原始碼

- core/      共用核心（calc.js 計算、data.js 資料、model.js 資料與計算邏輯、app1~3.js 介面、report.js 報告與 Word）
- lib/       engine.js：讓核心在 Node 執行
- mcp/       MCP 伺服器（server/index.js）、manifest.json、laws/
- tools/     build.py 組裝網頁版 dist/generator.html；sync-mcp.js 把核心複製到 mcp/
- test/      測試（snapshot 計算快照、t1、docx、smoke、word_ui、mcp_client）

## 常用指令

| 指令 | 用途 |
| --- | --- |
| `npm install` | 安裝套件（根目錄與 mcp/ 各執行一次） |
| `npm test` | 比對計算快照並產生 Word 測試檔（輸出到 test/out/） |
| `npm run test:update` | 重新產生計算快照，只在確定新結果正確時使用 |
| `npm run build` | 組裝網頁版到 dist/generator.html |
| `npm run mcp:sync` | 把 core/、lib/engine.js 複製到 mcp/（執行 MCP 前需先跑一次） |
| `npm run mcp:pack` | 同步後打包 MCP 擴充檔 |

核心只改 core/ 與 lib/ 這一份；mcp/core 與 mcp/server/engine.js 由 `npm run mcp:sync` 產生，不存進 git。

smoke.js、word_ui.js 需要另外安裝 playwright；mcp_client.js 需先執行 `npm run mcp:sync`。

規劃與進度：見 ../線上服務開發/README.md
