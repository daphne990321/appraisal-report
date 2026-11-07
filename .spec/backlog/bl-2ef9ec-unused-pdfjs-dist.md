**Problem:** 根目錄 package.json 列了 pdfjs-dist，但根目錄的程式（core、lib、tools、test）都沒有使用；只有 mcp/ 使用它（mcp/package.json 另列了 4.10.38）。

**Context:** 出處：package.json dependencies 的 pdfjs-dist ^6.3.289；grep 只在 mcp/server/index.js 找到 pdfjs 的 import，而它解析的是 mcp/package.json 的版本。同一個 package.json 還列了 docx 與 zod（docx 被 test/docx.js 與 test/summary.js 使用；zod 只被 mcp 使用，也值得確認）。

**Suggested next step:** legacy-retire 整個刪除根 package.json，不需要單獨處理。如果舊版要保留超過計畫期間，再單獨移除 pdfjs-dist 與 zod 並重跑 npm test。

**Why deferrable:** 根 package.json 會在 legacy-retire 整份刪除；移除不影響任何功能。
