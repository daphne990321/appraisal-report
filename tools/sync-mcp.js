/* 把共用核心複製到 mcp/ 底下（MCP 打包時只能包 mcp/ 資料夾內的檔案）
   核心只改 core/ 與 lib/ 這一份；mcp/core、mcp/server/engine.js 由本腳本產生，不要直接修改 */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const files = [
  ['core/calc.js', 'mcp/core/calc.js'],
  ['core/data.js', 'mcp/core/data.js'],
  ['core/data_j.txt', 'mcp/core/data_j.txt'],
  ['core/app1.js', 'mcp/core/app1.js'],
  ['core/report.js', 'mcp/core/report.js'],
  ['lib/engine.js', 'mcp/server/engine.js'],
];
fs.mkdirSync(path.join(root, 'mcp/core'), { recursive: true });
for (const [from, to] of files) fs.copyFileSync(path.join(root, from), path.join(root, to));
console.log('已同步 ' + files.length + ' 個核心檔案到 mcp/');
