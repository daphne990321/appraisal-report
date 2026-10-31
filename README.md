# 估價報告產生器 原始碼

- core/      共用核心（calc.js 計算、data.js 資料、app1~3.js 介面、report.js 報告與 Word）
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
