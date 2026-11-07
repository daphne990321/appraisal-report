# Requirements Document

## Introduction

本功能建立新版系統的基礎骨架：一個可以部署、可以開發、可以測試的空平台。它不包含任何業務功能（沒有帳號、案件、計算或報告），只提供後面每一段都要使用的共同基礎：

- 一套可以用一個指令啟動的服務（應用程式 + 資料庫），啟動時自動把資料庫 schema 更新到最新。
- 健康檢查，讓部署環境知道服務是否正常。
- 從環境變數讀取的設定，缺少設定時清楚報錯。
- 前端單頁應用的提供方式，以及一個佔位首頁。
- 全部在容器內進行的開發、檢查與測試流程，主機只需要容器工具。
- 使用真實資料庫、彼此隔離的自動測試。
- 和本機使用同一套指令的 CI。

舊版系統在本功能中完全不變。

本文件中的角色：

| 角色 | 說明 |
|------|------|
| 開發者 | 在本機修改程式、執行檢查與測試的人 |
| 部署者 | 在伺服器上啟動與維護一套服務的人 |
| CI | 在 pull request 與合併時自動執行檢查的流程 |
| 上游審查者 | 審查這次 pull request、決定是否接受新方向的人 |

## Alignment with Product Vision

product.md 的成功指標（計算結果符合 golden snapshot、事務所之間不互相看到資料、已簽名案件不能修改）都要靠可以重複執行的自動測試來保證。tech.md 決定這些測試必須使用真實的 PostgreSQL，並且開發、測試、建置都在容器內執行。本功能提供這個測試與部署的地基，讓後面每一段功能都能加上自己的測試，並用同樣的方式部署。

本功能也是新方向的第一個 pull request。上游審查者需要能用簡單的步驟把骨架跑起來，看到它可以運作，並確認舊版沒有受到影響。

## Requirements

### Requirement 1：部署啟動

**User Story:** As a 部署者, I want 用一個指令啟動應用程式與資料庫，並自動把資料庫更新到最新 schema, so that 部署與升級不需要手動步驟。

#### Acceptance Criteria

1. WHEN 部署者在填好設定的情況下啟動正式環境的服務 THEN 系統 SHALL 啟動資料庫與應用程式，把資料庫 schema 更新到最新版本，然後開始接受請求。
2. WHEN 應用程式重新啟動，而資料庫 schema 已經是最新版本 THEN 系統 SHALL 正常啟動，不改變 schema。
3. IF 資料庫在有限的等待時間內一直無法連線 THEN 應用程式 SHALL 停止並以非零的結束碼結束，log 中說明原因。
4. IF 資料庫 schema 更新失敗 THEN 應用程式 SHALL 停止並以非零的結束碼結束，不接受任何請求。
5. 應用程式 SHALL 透過設定中的網域值接上主機的反向代理；網域與其他部署值 SHALL NOT 寫死在程式或設定範本以外的地方。
6. 在正式環境中，資料庫 SHALL NOT 能從這套服務以外的地方直接連線。
7. WHEN 請求經過主機的反向代理到達應用程式 THEN 應用程式 SHALL 以原始請求的 scheme 與 host 處理它（例如應用程式產生的網址使用對外的 https 網址，不是內部位址）；應用程式接受哪些來源傳來的這些資訊 SHALL 可以用設定調整。

### Requirement 2：健康檢查

**User Story:** As a 部署者, I want 分開的「存活」與「可以服務」兩種檢查, so that 容器管理工具與監控可以分辨「程式停了」和「資料庫連不上」。

#### Acceptance Criteria

1. WHEN 應用程式正在執行 THEN 存活檢查 SHALL 回報正常，不論資料庫狀態如何。
2. WHEN 資料庫可以回應 THEN 可服務檢查 SHALL 回報正常。
3. IF 資料庫在短時間內沒有回應 THEN 可服務檢查 SHALL 回報無法服務（HTTP 503），回應內容 SHALL NOT 包含錯誤細節。
4. 容器的健康狀態 SHALL 依存活檢查判斷。

### Requirement 3：設定

**User Story:** As a 部署者, I want 所有設定都從環境變數讀取，缺少必要設定時立刻清楚報錯, so that 設定錯誤在啟動時就被發現，而不是在使用中才出錯。

#### Acceptance Criteria

1. 應用程式 SHALL 只從 process 環境變數讀取設定；工作目錄中的設定檔 SHALL NOT 影響應用程式的設定。
2. IF 缺少一個或多個必要的環境變數，或它們的值是空字串 THEN 啟動 SHALL 失敗，錯誤訊息 SHALL 列出每一個這樣的變數名稱。
3. 專案 SHALL 提供一份設定範本，列出這套服務讀取的每一個變數並附說明；範本中的密碼 SHALL 明確標示為只供開發使用；真正的設定檔 SHALL NOT 進入版本控制。
4. 密碼等祕密值 SHALL NOT 出現在 log、錯誤訊息或設定物件的文字表示中。

### Requirement 4：提供前端網頁

**User Story:** As a 使用者（透過瀏覽器）, I want 任何網址都能打開前端應用程式，而 API 錯誤仍然是 API 錯誤, so that 書籤和重新整理都能正常使用，而 API 的呼叫端不會收到一個網頁。

#### Acceptance Criteria

1. WHEN 瀏覽器以 GET 或 HEAD 要求應用程式內的任何頁面路徑（包含深層路徑）THEN 系統 SHALL 回傳前端的進入頁（HEAD 只回傳 header），而且這個回應 SHALL NOT 被瀏覽器長期快取。
2. WHEN 瀏覽器要求建置產生的靜態資源 THEN 系統 SHALL 回傳該資源，並允許瀏覽器長期快取。
3. IF 請求的路徑屬於 API、MCP 或健康檢查的範圍，而沒有對應的端點 THEN 系統 SHALL 回傳 JSON 格式的 404，SHALL NOT 回傳前端網頁。
4. IF 請求的路徑看起來是一個檔案，而這個檔案不存在 THEN 系統 SHALL 回傳 404，SHALL NOT 回傳前端網頁。
5. WHEN 沒有建置好的前端（開發環境）THEN 應用程式 SHALL 只提供 API 與健康檢查。
6. 前端 SHALL 顯示一個佔位首頁（不含視覺設計）。
7. IF 請求使用 GET 與 HEAD 以外的 method，而沒有對應的端點 THEN 系統 SHALL 回傳 JSON 格式的 404，SHALL NOT 回傳前端網頁。
8. IF 請求的路徑有對應的端點，但 method 不被接受 THEN 系統 SHALL 回傳 JSON 格式的 405，在開發與正式環境都一樣。
9. 保留的頂層路徑（`/api`、`/mcp`、`/healthz`、`/readyz`、`/assets`）之下的請求 SHALL NOT 得到前端網頁，不論是沒有對應的端點，還是端點自己回報找不到資料。

### Requirement 5：開發環境

**User Story:** As a 開發者, I want 主機只裝容器工具就能用一個指令啟動完整的開發環境, so that 每個人的環境都一樣，不用手動安裝語言與工具。

#### Acceptance Criteria

1. 開發者的主機 SHALL 只需要 podman（或 docker）與 compose，不需要安裝 Python、uv、Node 或 pnpm。
2. WHEN 開發者啟動開發環境 THEN 系統 SHALL 啟動應用程式、資料庫與前端開發伺服器。
3. WHEN 開發者修改後端原始碼 THEN 應用程式 SHALL 自動重新載入；WHEN 開發者修改前端原始碼 THEN 瀏覽器 SHALL 不用整頁重新整理就顯示變更。
4. 前端開發伺服器 SHALL 把 API 與 MCP 的請求轉給後端，讓瀏覽器只需要連一個網址。
5. 開發環境的服務 SHALL 只開放在本機（loopback）；對外的 port SHALL 可以用設定調整，讓兩份工作目錄可以同時執行。
6. IF 檔案變更的通知無法傳進容器 THEN 開發者 SHALL 可以只改設定值（不改程式）就切換成輪詢方式偵測變更。
7. 開發環境 SHALL NOT 接上主機的反向代理，也 SHALL NOT 收到對外網域的設定值；即使主機上已經有正式環境使用的代理網路也一樣。

### Requirement 6：開發者指令

**User Story:** As a 開發者, I want 用 compose 執行所有檢查、測試與依賴更新, so that 本機和 CI 使用同一套方式，不會出現「我這裡可以」的差異。

#### Acceptance Criteria

1. 後端的 lint、格式檢查、型別檢查與測試 SHALL 各自可以用一個 compose 指令執行。
2. 前端的 lint、型別檢查與測試 SHALL 各自可以用一個 compose 指令執行。
3. WHEN 開發者透過 compose 新增一個依賴 THEN 依賴宣告與 lock 檔 SHALL 在工作目錄中更新。
4. 同一組指令 SHALL 在 podman compose 與 docker compose 上都能執行。
5. IF lock 檔和依賴宣告不一致 THEN 開發環境 SHALL 仍然可以啟動並顯示警告，重新產生 lock 檔的指令 SHALL 仍然可以執行。
6. 日常的檢查與測試指令 SHALL NOT 在工作目錄中產生或修改檔案；只有開發者自己執行的依賴指令會更新依賴宣告與 lock 檔。

### Requirement 7：測試隔離

**User Story:** As a 開發者, I want 後端測試使用真實的 PostgreSQL，而且不碰到我的開發資料, so that 測試結果可信，而且可以隨時執行。

#### Acceptance Criteria

1. 後端測試 SHALL 使用一個為這次執行建立的一次性資料庫，並在執行結束後刪除它。
2. 測試執行 SHALL NOT 修改或刪除主要資料庫。
3. 一個測試寫入的資料 SHALL NOT 被其他測試看到。
4. IF 建立一次性資料庫或建立 schema 失敗 THEN 這次測試執行 SHALL 失敗，SHALL NOT 被當成跳過。
5. 資料庫 schema 的變更 SHALL 可以升級到最新、降回空白、再升級到最新。

### Requirement 8：資料庫命名慣例

**User Story:** As a 開發者, I want 資料庫的索引與約束名稱自動依專案慣例產生, so that 後面加入資料表時，名稱一致，schema 變更也能穩定比對。

#### Acceptance Criteria

1. WHEN 開發者定義索引、唯一約束、外鍵、檢查約束或主鍵 THEN 系統 SHALL 依專案慣例產生名稱（前綴 `ix_`、`uq_`、`fk_`、`ck_`、`pk_`，加上資料表與欄位名稱）。
2. 多欄位的唯一約束與索引 SHALL 在名稱中依序包含所有欄位名稱。

### Requirement 9：CI

**User Story:** As a 上游審查者, I want 每個 pull request 都自動執行和本機相同的檢查, so that 我不用自己執行就能知道變更是否通過。

#### Acceptance Criteria

1. WHEN 有 pull request，或有變更推送到主要分支，而變更涉及新版 THEN CI SHALL 用和本機相同的 compose 指令執行後端與前端的全部檢查與測試。
2. CI SHALL 建置正式環境的 image。
3. IF 任何一項檢查失敗 THEN CI SHALL 回報失敗。
4. 現有的 CI 流程 SHALL NOT 被修改。

### Requirement 10：舊版不受影響與說明文件

**User Story:** As a 上游審查者, I want 確認舊版完全沒有改變，並有一份說明告訴我怎麼執行新版, so that 我可以放心審查這個新方向。

#### Acceptance Criteria

1. 舊版的程式、測試與 workflow 檔案 SHALL 不變，舊版的測試 SHALL 照常通過；`.gitignore` 與 README SHALL 只新增新版需要的內容，原有的規則與內容 SHALL 保留。
2. README SHALL 新增一節繁體中文的新版說明（需求、啟動、常用指令、正式部署），並保留原有的內容。
3. 新版的檔案在任何作業系統 checkout 後 SHALL 使用 LF 換行；舊版檔案的換行處理 SHALL 不變。

### Requirement 11：後續功能的共同擴充點

**User Story:** As a 開發者, I want 後面的功能有固定的位置加入 API 端點，並有單一的資料庫 session 來源, so that 每一段功能用同樣的方式加入，而且測試可以完全控制資料庫的寫入。

#### Acceptance Criteria

1. 系統 SHALL 提供一個加入 API 端點的位置；後面的功能在這裡加入的端點 SHALL 都在同一個有版本的路徑前綴（`/api/v1`）之下。
2. 系統 SHALL 提供單一的資料庫 session 來源；請求處理與背景工作 SHALL 都從這個來源取得 session，而測試 SHALL 可以透過它讓一個測試中的每一筆寫入（包含透過 API 的寫入）在測試結束時消失。

## Non-Functional Requirements

### Performance
- **NFR-P1** 存活檢查 SHALL 不碰資料庫，並在 100 毫秒內回應。
- **NFR-P2** 可服務檢查 SHALL 在資料庫無回應時 3 秒內回報無法服務。
- **NFR-P3** 資料庫無法連線時，應用程式 SHALL 在設定的等待時間（預設 60 秒）結束後停止，不無限等待。

### Security
- **NFR-S1** 正式環境的應用程式容器 SHALL 以非 root 使用者執行。
- **NFR-S2** 祕密值 SHALL 只存在設定檔（不進版本控制）與 process 環境變數中，SHALL NOT 寫進 image。
- **NFR-S3** 正式環境的資料庫 SHALL NOT 開放任何對外 port；開發環境的服務 SHALL 只開放在本機。
- **NFR-S4** 正式環境的 image SHALL NOT 包含建置工具或開發依賴，也 SHALL NOT 包含設定檔。
- **NFR-S5** 說明文件 SHALL 在正式部署的段落醒目提醒部署者更換資料庫密碼；設定範本 SHALL 標示範本中的密碼只供開發使用。

### Reliability
- **NFR-R1** 啟動流程中任何一步失敗，應用程式 SHALL 停止，而不是在不完整的狀態下接受請求。
- **NFR-R2** 重複啟動 SHALL 不改變已經是最新的 schema。
- **NFR-R3** 正式環境的服務 SHALL 在異常結束後自動重新啟動。

### Usability
- **NFR-U1** 所有指令 SHALL 在 Windows、macOS 與 Linux 上相同，只依賴 compose。
- **NFR-U2** 錯誤訊息與 log SHALL 使用英文；說明文件 SHALL 使用繁體中文。
