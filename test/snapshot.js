/* 計算快照：把範例案件的計算、檢核、報告結果存成標準答案，整理程式後逐筆比對
   node test/snapshot.js          比對（有差異會列出並以錯誤結束）
   node test/snapshot.js --update 重新產生標準答案（只有在確定新結果正確時才用） */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../lib/engine').load();
const FILE = path.join(__dirname, 'snapshots', 'cases.json');

function build(){
  const A = E.fresh(); E.setA(A);
  const out = {};
  for (const c of A.cases){
    for (const M of A.models){
      const k = E.calc(c, M), v = E.validate(c, k);
      const ctx = {kind:E.kindOf(c.kind), cn:E.CALC.cnAmount, inds:E.indsOf(M,c), exp:E.expOf(M,c), selText:E.selText(M), marketStats:E.marketStats(c, M)};
      const blocks = E.REPORT.build(c, k, v, ctx);
      out[c.id + '@' + M.id] = { calc:k, validate:v, marketStats:ctx.marketStats, sales:E.filteredSales(c, M).map(x => x.id), blocks, html:E.REPORT.toHTML(blocks) };
    }
  }
  return JSON.parse(JSON.stringify(out));
}

function diff(a, b, p, list){
  if (list.length >= 30) return;
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) return list.push(p + '：' + JSON.stringify(a) + ' → ' + JSON.stringify(b));
  if (a && typeof a === 'object'){
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[key], b[key], p + '.' + key, list);
  } else if (a !== b) list.push(p + '：' + JSON.stringify(a) + ' → ' + JSON.stringify(b));
}

const now = build();
if (process.argv.includes('--update') || !fs.existsSync(FILE)){
  fs.writeFileSync(FILE, JSON.stringify(now, null, 1));
  console.log('已更新標準答案：' + Object.keys(now).length + ' 組（案件 × 模型）');
} else {
  const list = []; diff(JSON.parse(fs.readFileSync(FILE, 'utf8')), now, '', list);
  if (list.length){ console.log('與標準答案不一致：\n' + list.join('\n')); process.exit(1); }
  console.log('全部一致：' + Object.keys(now).length + ' 組（案件 × 模型）');
}
