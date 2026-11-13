/* 匯出 golden fixtures：把舊版 JS 引擎的輸入與標準答案存成 JSON，供 Python 移植版比對
   node tools/golden-export.js          重新寫入 backend/tests/golden/
   node tools/golden-export.js --check  在記憶體重新產生並與檔案比對，有差異就列出並以錯誤結束 */
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../lib/engine').load();
const OUT = path.join(__dirname, '..', 'backend', 'tests', 'golden');

const clone = x => JSON.parse(JSON.stringify(x));
const json = x => JSON.stringify(x, null, 1) + '\n';

/* 計算所需的輸入：保留 hideBuiltin（libOf 會讀取），其餘 UI 專用欄位不輸出 */
function dbInputs(db){
  return {
    v: db.v, hideBuiltin: db.hideBuiltin, models: db.models, imported: db.imported, own: db.own, cases: db.cases,
    builtin: { sales: E.BUILTIN.sales, rents: E.BUILTIN.rents }
  };
}

/* 與 test/snapshot.js 相同的輸出形狀 */
function runCase(c, M, db, format){
  const k = E.calc(c, M, db), v = E.validate(c, k, db);
  const ctx = { kind: E.kindOf(c.kind), cn: E.CALC.cnAmount, inds: E.indsOf(M, c), exp: E.expOf(M, c), selText: E.selText(M), marketStats: E.marketStats(c, M, db), capName: '' };
  const blocks = format === 'summary' ? E.REPORT.buildSummary(c, k, v, ctx) : E.REPORT.build(c, k, v, ctx);
  return clone({ calc: k, validate: v, marketStats: ctx.marketStats, sales: E.filteredSales(c, M, db).map(x => x.id), blocks, html: E.REPORT.toHTML(blocks) });
}

const db = E.fresh();
const files = {};   // 相對路徑 → 內容
const results = {}; // 情境名稱 → 輸出（供防呆比對）
files['inputs/db.json'] = json(dbInputs(clone(db)));

function emit(name, description, c, M, extra){
  extra = extra || {};
  if (!c.basic.priceDate) throw new Error('scenario ' + name + ': priceDate must be set (calc would read the clock)');
  const format = extra.format || 'narrative';
  const expected = runCase(c, M, db, format);
  const doc = { name, description, case: c, modelId: M.id };
  if (extra.mutatedModel) doc.model = M;
  if (format === 'summary') doc.format = 'summary';
  doc.expected = expected;
  files['cases/' + name + '.json'] = json(doc);
  results[name] = expected;
  return expected;
}

/* 基礎情境：3 個範例案件 × 2 個模型，與 test/snapshot.js 一致 */
const baseName = (c, M) => 'base-' + c.id + '-' + M.id;
for (const c of db.cases){
  for (const M of db.models){
    emit(baseName(c, M), '基礎情境：範例案件 ' + c.id + '（' + E.kindOf(c.kind).name + '）搭配模型「' + M.name + '」，與 test/snapshot.js 相同。', clone(c), clone(M));
  }
}

const caseOf = id => clone(db.cases.find(x => x.id === id));
const modelOf = id => clone(db.models.find(x => x.id === id));

/* 變化情境：複製基礎情境，只切換一個分支；guard 預設要求 calc 與基礎不同 */
function variant(name, baseCaseId, modelId, description, mutate, opt){
  opt = opt || {};
  const c = caseOf(baseCaseId), M = modelOf(modelId);
  mutate(c, M);
  const mutated = JSON.stringify(M) !== JSON.stringify(db.models.find(x => x.id === modelId));
  const e = emit(name, description, c, M, { mutatedModel: mutated });
  const base = results[baseName({ id: baseCaseId }, { id: modelId })];
  const keys = opt.guard || ['calc'];
  if (!keys.some(key => JSON.stringify(e[key]) !== JSON.stringify(base[key])))
    throw new Error('scenario ' + name + ': output ' + keys.join('/') + ' equals base scenario, so the branch was not taken');
}

const U = '115-0412', L = '115-0420', H = '115-0431';

/* 比較法：差額法／計量模型／直接輸入 */
variant('comp-diff-grade', U, 'm1', '比較法差額法（diff）搭配七級評定：每級差額取模型指標的 stepAmt。',
  c => { c.comp.method = 'diff'; });
variant('comp-diff-amt', U, 'm1', '比較法差額法搭配直接輸入（inputMode=value）：各項調整直接讀 adj.amt（萬元/坪）。',
  c => {
    c.comp.method = 'diff'; c.comp.inputMode = 'value';
    c.comps[0].adj = { i1: { lv: 0, pct: 0, amt: 0.5 }, i2: { lv: 0, pct: 0, amt: 0.4 } };
    c.comps[1].adj = { i1: { lv: 0, pct: 0, amt: -0.6 }, i3: { lv: 0, pct: 0, amt: 0.5 }, i4: { lv: 0, pct: 0, amt: -1.2 } };
    c.comps[2].adj = { r1: { lv: 0, pct: 0, amt: 1.0 }, r3: { lv: 0, pct: 0, amt: 0.8 }, i1: { lv: 0, pct: 0, amt: 1.1 } };
  });
variant('comp-pct-value', U, 'm1', '比較法百分率法搭配直接輸入（inputMode=value）：各項調整直接讀 adj.pct。',
  c => {
    c.comp.inputMode = 'value';
    c.comps[0].adj = { i1: { lv: 0, pct: 1.5, amt: 0 }, i2: { lv: 0, pct: 0.5, amt: 0 } };
    c.comps[1].adj = { i1: { lv: 0, pct: -1.2, amt: 0 }, i4: { lv: 0, pct: -2.5, amt: 0 } };
    c.comps[2].adj = { r1: { lv: 0, pct: 2.2, amt: 0 }, i1: { lv: 0, pct: 3, amt: 0 } };
  });
variant('comp-reg', U, 'm1', '比較法計量模型分析法（reg）：以內建實價登錄資料做 OLS 迴歸推估，不使用比較標的。',
  c => { c.comp.method = 'reg'; });

/* 權重模式 */
variant('weight-deviation', U, 'm1', '權重模式 deviation：依差異百分率偏離率自動計算比較標的權重。',
  (c, M) => { M.settings.weightMode = 'deviation'; });
variant('weight-inverse', U, 'm1', '權重模式 inverse：依總調整率倒數自動計算比較標的權重。',
  (c, M) => { M.settings.weightMode = 'inverse'; });

/* 收益法資本化率 */
variant('income-cap-risk', U, 'm1', '收益法資本化率採風險溢酬法（capMode=risk）。', c => { c.income.capMode = 'risk'; });
variant('income-cap-wacc', U, 'm1', '收益法資本化率採加權平均資金成本法（capMode=wacc），自有資金 40% × 2.8、借貸資金 60% × 2.2。',
  c => { c.income.capMode = 'wacc'; c.income.wacc = [{ name: '自有資金', w: 40, k: 2.8 }, { name: '借貸資金', w: 60, k: 2.2 }]; });
variant('income-cap-dcr', U, 'm1', '收益法資本化率採債務保障比率法（capMode=dcr）：DCR 1.2、利率 2.5%、30 年、貸款成數 70%。',
  c => { c.income.capMode = 'dcr'; });
variant('income-cap-egim', U, 'm1', '收益法資本化率採有效總收入乘數法（capMode=egim）：淨收益率 70、乘數 55。',
  c => { c.income.capMode = 'egim'; });

/* 收益法 DCF（非旅館案件） */
variant('income-dcf-nonhotel', U, 'm1', '收益法改用 DCF（method=dcf）於非旅館的區分所有建物案件，租金收入模式。',
  c => { c.income.method = 'dcf'; });

/* 成本法折舊（旅館案件含成本法） */
variant('cost-dep-declining', H, 'm1', '成本法折舊採定率法（declining），殘餘價格率 10%。',
  c => { c.cost.depMethod = 'declining'; c.cost.salvage = 10; });
variant('cost-dep-declining-zero-salvage', H, 'm1', '成本法折舊採定率法但殘餘價格率為 0：退回等速計算並產生 depNote 說明。',
  c => { c.cost.depMethod = 'declining'; c.cost.salvage = 0; });
variant('cost-dep-sinking', H, 'm1', '成本法折舊採償債基金法（sinking），利率 2%、殘餘價格率 5%。',
  c => { c.cost.depMethod = 'sinking'; c.cost.sinkRate = 2; c.cost.salvage = 5; });

/* 土地開發分析法詳細版：利息率模式 */
variant('land-lda-imode-formula', L, 'm1', '土地開發分析法詳細版，利息率採公式（iMode=formula）：年利率 × 土地投資比重 × 年數。',
  c => { c.land.iMode = 'formula'; });
variant('land-lda-imode-input', L, 'm1', '土地開發分析法詳細版，利息率直接輸入（iMode=input）：iInput 3.5%。',
  c => { c.land.iMode = 'input'; c.land.iInput = 3.5; });

/* 特定價格／開發後價格折現（special） */
variant('land-special-wacc', L, 'm1', '土地 special 啟用（容積 200%、折現 2 年），折現率採 WACC 加風險溢酬（rateMode=wacc）。',
  c => { c.special.enabled = true; c.special.far = 200; c.special.years = 2; });
variant('land-special-rate-input', L, 'm1', '土地 special 啟用，折現率直接輸入（rateMode=input）4.5%。',
  c => { c.special.enabled = true; c.special.far = 200; c.special.years = 2; c.special.rateMode = 'input'; c.special.rateInput = 4.5; });

/* 價格日期調整、單位顯示 */
variant('date-manual', U, 'm1', '價格日期調整改為逐筆手動輸入（dateMode=manual），各比較標的給定 dateAdj。',
  (c, M) => { M.settings.dateMode = 'manual'; c.comps[0].dateAdj = 0.6; c.comps[1].dateAdj = 1.2; c.comps[2].dateAdj = 1.8; });
variant('unit-display-yuan', U, 'm1', '單價顯示單位改為元/坪（unitDisplay=yuan），影響報告文字。',
  (c, M) => { M.settings.unitDisplay = 'yuan'; });

/* 價格型態 */
variant('comp-price-ask', U, 'm1', '比較標的 A 為擬售價格（priceType=ask），扣除議價空間 8%。',
  c => { c.comps[0].priceType = 'ask'; c.comps[0].bargain = 8; });
variant('basic-price-specific', U, 'm1', '案件價格種類改為特定價格，並填入同時估計之正常價格（報告揭露文字不同）。',
  c => { c.basic.priceType = '特定價格'; c.basic.normalPrice = '2000'; }, { guard: ['validate', 'html'] });

/* 摘要式報告（bl-a9e50a） */
function summary(name, baseCaseId, description, mutate){
  const c = caseOf(baseCaseId), M = modelOf('m1');
  mutate(c);
  if (E.reportFormat(c) !== 'summary') throw new Error('scenario ' + name + ': reportFormat is not summary');
  const e = emit(name, description, c, M, { format: 'summary' });
  const base = results[baseName({ id: baseCaseId }, { id: 'm1' })];
  if (e.html === base.html) throw new Error('scenario ' + name + ': summary html equals narrative html of base scenario');
}
const chk = { entered: '未能入內', photoByClient: true, useNow: '自用', nuis: ['近高架道路'], noLien: true, area: { main: 60, attach: 10, common1: 20, common2: 10, park: 0, other: 0 } };
summary('summary-115-0412-mortgage', U, '摘要式報告：區分所有建物、估價目的為抵押權設定（預設用摘要式），含 chk 勾選答案、無他項權利。',
  c => { c.basic.purpose = '抵押權設定'; c.chk = clone(chk); });
summary('summary-115-0412-cost-lien', U, '摘要式報告：同上但加採成本法，並列他項權利（最高限額抵押權）。',
  c => {
    c.basic.purpose = '抵押權設定'; c.chk = clone(chk);
    c.methods.cost = true; c.chk.noLien = false; c.chk.liens = [{ order: '1', kind: '最高限額抵押權', amount: 15600000, holder: '○○銀行' }];
  });
summary('summary-115-0420-land-forced', L, '摘要式報告：土地案件（預設敘述式）強制使用摘要式，不輸出建物題目。',
  c => { c.report = c.report || {}; c.report.format = 'summary'; c.chk = { useNow: '閒置', ext: '有', bldgVacancy: 5, roadW: '30 公尺以上' }; });

/* 寫入／比對 */
function listFiles(dir, base){
  base = base || '';
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? listFiles(path.join(dir, d.name), base + d.name + '/') : (d.name.endsWith('.json') ? [base + d.name] : []));
}

if (process.argv.includes('--check')){
  const list = [];
  for (const [rel, text] of Object.entries(files)){
    const p = path.join(OUT, rel);
    if (!fs.existsSync(p)) list.push('missing file: ' + rel);
    else if (fs.readFileSync(p, 'utf8') !== text) list.push('differs: ' + rel);
  }
  for (const rel of listFiles(OUT)) if (!(rel in files)) list.push('unexpected file: ' + rel);
  if (list.length){ console.log('golden fixtures are out of date:\n' + list.slice(0, 30).join('\n') + '\n(run: npm run golden:export)'); process.exit(1); }
  console.log('golden fixtures match: ' + Object.keys(files).length + ' files');
} else {
  for (const rel of listFiles(OUT)) if (!(rel in files)) fs.unlinkSync(path.join(OUT, rel));
  for (const [rel, text] of Object.entries(files)){
    const p = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
  }
  console.log('golden fixtures written: ' + Object.keys(files).length + ' files -> ' + path.relative(process.cwd(), OUT));
}
