# 估價報告產生器 原始碼

- core/      共用核心（calc.js 計算、data.js 資料、app1~3.js 介面、report.js 報告與 Word）
- lib/       engine.js：讓核心在 Node 執行
- mcp/       MCP 伺服器（server/index.js）、manifest.json、laws/
- tools/     build.py 組裝網頁版 dist/generator.html
- test/      測試（t1、smoke、docx、word_ui、mcp_client）

重新安裝套件：在根目錄與 mcp/ 各執行 `npm install`。
打包 MCP：在 mcp/ 執行 `npx @anthropic-ai/mcpb pack`（需先把 lib/engine.js 與 core 複製到 mcp/server、mcp/core）。
網頁版：`python3 tools/build.py`（需 python3，輸出 dist/）。
架構與待辦：見 Project「估價師」的 設計/MCP與系統架構.md
