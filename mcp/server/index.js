#!/usr/bin/env node
/* 不動產估價報告產生器 MCP 伺服器
   與網頁版共用同一份計算與報告核心（core/），案件存成 JSON 檔，可與網頁版互相匯入。
   估價師簽名不在本伺服器範圍：報告一律標為草稿，由估價師在網頁版或 Word 檔確認後簽名。 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const docx = require('docx');
const E = require('./engine').load(path.join(__dirname, '..', 'core'));

const VERSION = '0.5.0';
const DATA_DIR = expandHome(process.env.APPRAISAL_DATA_DIR || path.join(os.homedir(), 'Documents', '估價報告'));
const DIRS = { cases: path.join(DATA_DIR, 'cases'), lvr: path.join(DATA_DIR, 'lvr'), reports: path.join(DATA_DIR, 'reports') };
const LAW_DIR = path.join(__dirname, '..', 'laws');

function expandHome(p){ p = String(p || '').trim(); if (p.startsWith('~')) p = path.join(os.homedir(), p.slice(1)); return p.replace(/\$\{HOME\}/g, os.homedir()); }
function ensureDirs(){ Object.values(DIRS).forEach(d => fs.mkdirSync(d, { recursive: true })); }
function readJSON(f, fb){ try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return fb; } }
function writeJSON(f, o){ fs.mkdirSync(path.dirname(f), { recursive: true }); const tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(o, null, 2)); fs.renameSync(tmp, f); }
function safeId(id){ if (!/^[\w\-]+$/.test(String(id || ''))) throw new Error('案號只能包含英數字、- 與 _：' + id); return String(id); }
function out(obj){ return { content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1) }] }; }
function fail(msg){ return { content: [{ type: 'text', text: msg }], isError: true }; }
function wrap(fn){ return async (args) => { try { return await fn(args || {}); } catch (e) { return fail('錯誤：' + (e && e.message || String(e))); } }; }
function round(x, d){ if (x === null || x === undefined || !isFinite(x)) return null; const p = Math.pow(10, d === undefined ? 2 : d); return Math.round(x * p) / p; }

/* ---------- 儲存 ---------- */
const MODELS_FILE = path.join(DATA_DIR, 'models.json');
const OWN_FILE = path.join(DATA_DIR, 'own_cases.json');
function models(){
  let m = readJSON(MODELS_FILE, null);
  if (!Array.isArray(m) || !m.length){ const f = E.fresh(); m = f.models; ensureDirs(); writeJSON(MODELS_FILE, m); }
  return m;
}
function saveModels(m){ writeJSON(MODELS_FILE, m); }
function modelById(id){ const m = models(); return m.find(x => x.id === id) || m[0]; }
function caseFile(id){ return path.join(DIRS.cases, safeId(id) + '.json'); }
function loadCase(id){
  const o = readJSON(caseFile(id), null);
  if (!o) throw new Error('找不到案件 ' + id + '（請先用 case_list 查看案號）');
  return o.case || o;
}
function saveCase(c){ ensureDirs(); const M = (c.signed && c.modelSnapshot) ? c.modelSnapshot : modelById(c.modelId); writeJSON(caseFile(c.id), { format: 'appraisal-case', v: 5, savedAt: new Date().toISOString(), case: c, model: M }); }
function listCases(){
  ensureDirs();
  return fs.readdirSync(DIRS.cases).filter(f => f.endsWith('.json')).map(f => { const c = (readJSON(path.join(DIRS.cases, f), {}) || {}).case; return c && c.id ? c : null; }).filter(Boolean);
}
function lvrData(){
  ensureDirs(); const sales = [], rents = [];
  fs.readdirSync(DIRS.lvr).filter(f => f.endsWith('.json')).forEach(f => { const o = readJSON(path.join(DIRS.lvr, f), {}); (o.sales || []).forEach(x => sales.push(x)); (o.rents || []).forEach(x => rents.push(x)); });
  return { sales, rents };
}
/* 讓核心程式以本案為「目前案件」運作 */
function stateFor(c){
  const imp = lvrData();
  const hide = imp.sales.concat(imp.rents).some(x => x.county === '新竹縣');
  const st = { v: 5, models: models(), imported: imp, own: readJSON(OWN_FILE, []), hideBuiltin: hide, cases: [c], caseId: c.id, tab: 'report', dataSub: 'subject', paramSub: 'model', pModel: c.modelId, role: 'appraiser', side: true, ui: {} };
  E.setA(st); return st;
}
function MOD(c){ return (c.signed && c.modelSnapshot) ? c.modelSnapshot : modelById(c.modelId); }
function compute(c){ stateFor(c); const M = MOD(c), k = E.calc(c, M), v = E.validate(c, k); return { M, k, v }; }
function nextId(){
  const roc = new Date().getFullYear() - 1911; let mx = 0;
  listCases().forEach(c => { const m = String(c.id).match(/^(\d+)-(\d+)$/); if (m && Number(m[1]) === roc) mx = Math.max(mx, Number(m[2])); });
  return roc + '-' + String(mx + 1).padStart(4, '0');
}
function deepMerge(a, b){
  if (Array.isArray(b) || b === null || typeof b !== 'object') return b;
  const o = Object.assign({}, a);
  Object.keys(b).forEach(k => { o[k] = (a && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) ? deepMerge(a[k], b[k]) : b[k]; });
  return o;
}
const LOCKED_KEYS = ['signed', 'signedAt', 'modelSnapshot', 'id'];
function stripLocked(p){ const o = Object.assign({}, p); LOCKED_KEYS.forEach(k => delete o[k]); return o; }
function assertEditable(c){ if (c.signed) throw new Error('案件 ' + c.id + ' 已由估價師簽名交付，資料已鎖定；要修改請在網頁版「複製本案」。'); }

/* ---------- 結果摘要 ---------- */
function summary(c, r){
  const { k, v, M } = r, S = k.S;
  const m = {};
  [['comparison', k.comp.unit], ['income', k.inc.unit], ['cost', k.cost.unit], ['land', k.land.unit]].forEach(([key, u]) => { if (c.methods[key]) m[key] = u; });
  const res = {
    案號: c.id, 類型: E.kindOf(c.kind).name, 估價模型: M.name, 估價目的: c.basic.purpose, 價格日期: c.basic.priceDate,
    面積坪: round(k.area, 2), 各方法單價_萬元每坪: m,
    權重: k.fin.methods.map(x => ({ 方法: x.name, 單價: x.unit, 權重: x.w })),
    方法差異百分比: round(k.fin.diff, 1), 決定單價_萬元每坪: k.fin.unit, 總價_萬元: k.fin.totalWan, 總價_元: k.fin.yuan,
    總價國字: k.fin.yuan ? E.CALC.cnAmount(k.fin.yuan) : null,
    比較法: c.methods.comparison ? { 採用件數: k.comp.usedCount, 試算價格差距百分比: round(k.comp.gap, 2), 權重合計: round(k.comp.wSum, 1),
      明細: (k.comp.rows || []).map((r2, i) => ({ 標的: c.comps[i].label, 位置: c.comps[i].loc, 單價: c.comps[i].price, 情況: r2.cond, 日期: round(r2.date, 2), 區域: round(r2.r, 2), 個別: round(r2.i, 2), 總調整率: round(r2.total, 1), 試算價格: r2.trial, 權重: round(r2.weight, 1), 採用: r2.usable })) } : undefined,
    收益法: c.methods.income ? { 有效總收入: Math.round(k.inc.egi), 淨收益: Math.round(k.inc.noi), 資本化率: c.income.method === 'direct' ? round(k.inc.cap, 2) : undefined, 收益價格_元: k.inc.price === null ? null : Math.round(k.inc.price) } : undefined,
    成本法: c.methods.cost ? { 建物總成本: Math.round(k.cost.T), 累積折舊: Math.round(k.cost.dep), 土地價格: Math.round(k.cost.land), 房地成本價格: Math.round(k.cost.price) } : undefined,
    土地開發分析法: c.methods.land ? { 總銷售金額: Math.round(k.land.S), 直接成本: Math.round(k.land.C), 間接成本: Math.round(k.land.M), 利潤率: round(k.land.R * 100, 2), 資本利息綜合利率: round(k.land.i * 100, 2), 土地開發分析價格: Math.round(k.land.V) } : undefined,
    逐筆土地: k.parcels ? k.parcels.rows.map(r2 => ({ 地號: (r2.p.section || '') + (r2.p.no || ''), 坪: round(r2.ping, 4), 單價: r2.unit === null ? null : round(r2.unit, 2), 總價_元: r2.total === null ? null : Math.round(r2.total), 增值稅_元: r2.vat.tax })) : undefined,
    特定價格: k.special ? { 條件: c.special.label, 單價: k.special.unit, 總價_萬元: k.special.totalWan, 折現率: round(k.special.rate, 2), 折現比例: round(k.special.df, 4) } : undefined,
    簽名前須處理: v.bl.map(x => x.t + '（' + x.law + '）'),
    提醒: v.warns.map(x => x.t + '（' + x.law + '）'),
    須敘明事項: v.notes.map(x => x.t + '（' + x.law + '）'),
    必載事項完成: v.items.filter(Boolean).length + '/15',
    已簽名: !!c.signed
  };
  if (S.unitDisplay === 'yuan') res.單位說明 = '報告書以元表示';
  return res;
}
function reportBlocks(c, r){
  const { k, v, M } = r; let st = null; try { st = E.marketStats(c, M); } catch (e) {}
  return E.REPORT.build(c, k, v, { kind: E.kindOf(c.kind), cn: E.CALC.cnAmount, inds: E.indsOf(M, c), exp: E.expOf(M, c), selText: c.comp.method === 'reg' ? '' : E.selText(M), marketStats: st, capName: '' });
}
function blocksToText(blocks){
  return blocks.map(b => {
    const clean = t => String(t == null ? '' : t).replace(/⟦([^⟧]*)⟧/g, '【待填：$1】');
    switch (b.t){
      case 'cover': return '# ' + b.title + '\n' + b.rows.map(r => '- ' + r[0] + '：' + clean(r[1])).join('\n');
      case 'letter': return '## 函\n' + clean(b.to) + ' 公鑒：\n' + b.body.map(clean).join('\n');
      case 'h1': return '\n## ' + b.text; case 'h2': return '### ' + b.text; case 'h3': return '#### ' + b.text;
      case 'p': case 'amount': return clean(b.text);
      case 'list': return b.items.map((x, i) => (b.ordered ? (i + 1) + '. ' : '- ') + clean(x)).join('\n');
      case 'kv': return b.rows.map(r => '- ' + r[0] + '：' + clean(r[1])).join('\n');
      case 'table': return '| ' + b.head.join(' | ') + ' |\n|' + b.head.map(() => '---').join('|') + '|\n' + b.rows.map(r => '| ' + r.map(clean).join(' | ') + ' |').join('\n');
      default: return '';
    }
  }).filter(Boolean).join('\n\n');
}

/* ---------- 實價登錄 ---------- */
function countyCode(q){
  q = String(q || '').trim(); const C = E.COUNTIES;
  const hit = C.find(x => x[0].toUpperCase() === q.toUpperCase() || x[1] === q || x[1].replace('臺', '台') === q.replace('臺', '台'));
  if (!hit) throw new Error('無法辨識縣市「' + q + '」，可用縣市名或代碼：' + C.map(x => x[0] + ' ' + x[1]).join('、'));
  return hit;
}
async function fetchText(url){
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 appraisal-report-mcp' }, redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer()); const t = buf.toString('utf8');
  if (/<html/i.test(t.slice(0, 300))) throw new Error('伺服器回傳網頁而非 CSV');
  return t;
}
function dedupeKey(x){ return [x.kind, x.addr, x.date, x.areaPing, x.unitWan || x.rentTotal, x.floorNum].join('|'); }

/* ---------- PDF（謄本）文字擷取 ---------- */
let pdfjsP = null;
async function pdfText(file){
  if (!pdfjsP) pdfjsP = import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjs = await pdfjsP;
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false, verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++){ const pg = await doc.getPage(i); const tc = await pg.getTextContent(); let line = '', last = null; const lines = [];
    tc.items.forEach(it => { const y = it.transform ? Math.round(it.transform[5]) : 0; if (last !== null && Math.abs(y - last) > 3){ lines.push(line); line = ''; } line += it.str; last = y; });
    if (line) lines.push(line); pages.push(lines.join('\n')); }
  await doc.destroy(); return pages.join('\n\n— 下一頁 —\n\n');
}
function transcriptHints(t){
  const h = {};
  const grab = (re) => Array.from(new Set((t.match(re) || []).map(s => s.replace(/\s+/g, ''))));
  h.地號 = grab(/[一-龥○]{1,8}段[一-龥○]{0,6}(?:小段)?\s*[\d\-]+\s*地號/g);
  h.建號 = grab(/[一-龥○]{1,8}段[一-龥○]{0,6}(?:小段)?\s*[\d\-]+\s*建號/g);
  h.面積 = grab(/面\s*積[：:\s]*[\*＊\s]*[\d,\.]+\s*平方公尺/g);
  h.權利範圍 = grab(/權利範圍[：:\s]*[^\n]{1,30}/g);
  h.公告土地現值 = grab(/公告土地現值[：:\s]*[^\n]{1,30}/g);
  h.前次移轉現值 = grab(/前次移轉現值[^\n]{1,40}/g);
  h.使用分區 = grab(/使用分區[：:\s]*[^\n]{1,20}/g);
  h.他項權利 = grab(/(?:權利種類|擔保債權總金額|設定權利範圍)[：:\s]*[^\n]{1,40}/g);
  Object.keys(h).forEach(k => { if (!h[k].length) delete h[k]; else h[k] = h[k].slice(0, 30); });
  return h;
}

/* ---------- 法規 ---------- */
const LAWS = { 技術規則: '01_技術規則.md', 估價師法: '02_估價師法.md', 施行細則: '03_施行細則.md' };
function lawText(name){ const f = LAWS[name]; if (!f) throw new Error('法規名稱請用：' + Object.keys(LAWS).join('、')); return fs.readFileSync(path.join(LAW_DIR, f), 'utf8'); }
function lawArticles(name){
  const t = lawText(name), arts = []; const re = /^### 第 ([\d\-]+) 條\n([\s\S]*?)(?=^### |^## |\s*$(?![\s\S]))/gm; let m;
  while ((m = re.exec(t))) arts.push({ no: m[1], text: m[2].trim() });
  return arts;
}

/* ---------- 伺服器 ---------- */
const server = new McpServer({ name: 'appraisal-report', version: VERSION }, {
  instructions: '台灣不動產估價報告產生器。流程：list_options 了解類型與因素細項 → case_create 建案（選土地、建物或商用類型）→ transcript_read 讀謄本 PDF 並以 case_update 寫入標示、權利、公告現值 → lvr_fetch 下載實價登錄、comps_autopick 或 comps_add 建立比較標的 → case_update 填入收益、成本、開發參數與因素分析 → case_calculate 檢查結果與「簽名前須處理」→ report_docx 產出 Word 草稿。所有數字由核心程式依不動產估價技術規則計算，不要自行心算估價金額；估價師簽名須由估價師本人在網頁版完成。法規條文以 law_lookup 查詢原文。'
});
const anyObj = z.record(z.string(), z.any());

server.registerTool('list_options', {
  title: '查詢可用選項', description: '列出標的類型、估價目的、建物型態、縣市代碼、估價模型，以及各類型比較法因素細項的 id（comps_add 的 adj 使用）與案件欄位說明。',
  inputSchema: { kind: z.string().optional().describe('只看某一類型的因素細項，例如 land、unit、hotel') }
}, wrap(async ({ kind }) => {
  const ms = models(), M = ms[0];
  const sets = {}; Object.keys(E.FACTOR_SETS || {}).forEach(s => { sets[s] = ((M.indicatorSets || {})[s] || []).map(x => ({ id: x.id, 分類: x.group === 'region' ? '區域' : '個別', 大類: x.cat, 細項: x.name, 每級百分率: x.step, 啟用: x.on })); });
  const kinds = E.KINDS.map(x => ({ id: x.id, 群組: x.group, 名稱: x.name, 說明: x.hint, 因素套組: x.set, 預設方法: x.methods }));
  return out({
    標的類型: kind ? kinds.filter(x => x.id === kind) : kinds,
    估價目的: E.PURPOSES, 建物型態: E.BTYPES, 縣市: E.COUNTIES.map(x => x[0] + ' ' + x[1]),
    估價模型: ms.map(m => ({ id: m.id, 名稱: m.name, 說明: m.note })),
    因素細項: kind ? { [E.kindOf(kind).set]: sets[E.kindOf(kind).set] } : sets,
    經驗調整: (M.exp || []).map(e => ({ id: e.id, 條件: e.name, 調整率: e.pct, 適用: e.sets })),
    案件欄位: {
      basic: 'county 縣市, district 鄉鎮市區, road 路名, addr 門牌或坐落, bldgNo 建號, landNo 地號, zone 使用分區, btype 建物型態, area 建物面積(坪), landShare 基地持分(坪), floorNum 所在樓層, totalFloors 總樓層, completed 建物完成日 YYYY-MM-DD, floorDesc 構造, owner 所有權人及權利範圍, encumbrance 他項權利, purpose 估價目的, priceDate 價格日期, surveyDate 勘察日期, priceType 正常價格等, conditions 估價條件, client 委託人, fee, contractDate, scope',
      parcels: '[{section 地段, no 地號, zone, areaM2 面積㎡, share 權利範圍小數, annVal 公告現值元/㎡, prevVal 前次移轉現值元/㎡, prevDate, cpi 物價指數%, priceMode base|announced|manual, adjPct, annPct, unit 萬元/坪, note}]',
      survey: 'led 領勘, indoor 進入室內, photos, useStatus 使用現況, illegal none|exclude|separate, notes 訪談紀錄, d:{traffic,life,school,nuisance,floor,view,light,layout,cond,mgmt}',
      analysis: 'general 一般因素, region 區域因素, indiv 個別因素, hbu 最有效使用, confirmed（須由估價師確認，請勿自行設為 true）',
      report: 'market 市場概況, leader 領勘人, surveyRefs, dataSources, otherBurden, restrict 限制登記, zoneRule, methodReason, notUsedReason',
      methods: 'comparison, income, cost, land（布林）, singleReason',
      comp: 'method pct|diff|reg, inputMode grade|value, volumeBasis 容積地價, subjFar 勘估標的容積率%',
      income: 'method direct|dcf, revMode rent|hotel, rent 月租金, rooms, adr, occ, otherPct, opexPct, mgmtPct, vacMonths, exp:[{name,amt}], capMode input|risk|extract|wacc|dcr|egim, cap, dcf:{years,disc,rentGrowth,rentGrowth2,switchYear,expGrowth,termCap,sellCost}',
      cost: 'conMethod unit|items, unitCost 萬元/坪, indexPct, design, adSell, mgmt, tax, interest, profit, life, salvage, depMethod straight|declining|sinking, ageManual, age, landUnit 萬元/坪, extras:[{name,amt,depPct}], extraLand 元',
      land: 'mode detailed|simple, site 坪, far 容積率%, bonus, floorsAbove, floorsBelow, digRate, freeFactor, saleFactor, firstFloorRatio, baseUnit 比準層單價, baseFloor, util1F, utilStep, cars, pingPerCar, carPrice 萬元, conUnit, conIndex, design, adSell, mgmt, tax, profit, iMode table|formula|input, ownRatio, ownRate, loanRate, buildMonths, landMonths',
      special: 'enabled, label, far, years, rateMode wacc|input, ownRatio, ownRate, loanRate, prem:{liquidity,risk,growth,mgmt}, rateInput, w:{comparison,land}',
      final: 'useModelWeights, w:{comparison,income,cost,land}, reviewed（§15 檢討，須估價師確認）, reason 價格決定理由',
      appraiser: 'name, certNo, licenseNo, licenseExp, office, guild, guildNo', other: '其他必要事項（一行一項）'
    },
    資料夾: DATA_DIR
  });
}));

server.registerTool('case_create', {
  title: '建立案件', description: '建立新估價案件。kind 選標的類型：land 土地、industrial 工業用地、unit 區分所有建物、house 透天厝、hotel 旅館、commercial 商辦商場、factory 廠房。會依類型帶入預設估價方法與權重。',
  inputSchema: { kind: z.enum(['unit', 'house', 'land', 'industrial', 'hotel', 'commercial', 'factory']), id: z.string().optional().describe('案號，省略則自動編號（民國年-流水號）'), model_id: z.string().optional(), basic: anyObj.optional().describe('基本資料，欄位見 list_options'), appraiser: anyObj.optional() }
}, wrap(async ({ kind, id, model_id, basic, appraiser }) => {
  ensureDirs(); const cid = id ? safeId(id) : nextId();
  if (fs.existsSync(caseFile(cid))) throw new Error('案號 ' + cid + ' 已存在');
  const M = modelById(model_id); let c = E.blankCase(cid, M, null, kind);
  c.modelId = M.id; c.basic.county = ''; c.basic.district = '';
  if (basic) c.basic = Object.assign(c.basic, basic);
  if (appraiser) c.appraiser = Object.assign(c.appraiser, appraiser);
  if (E.isLandKind(kind)) c.basic.btype = '土地';
  saveCase(c);
  return out({ 已建立: cid, 類型: E.kindOf(kind).name, 模型: M.name, 檔案: caseFile(cid), 下一步: '用 case_update 填入標示、權利、勘察資料；土地請填 parcels。' });
}));

server.registerTool('case_list', { title: '案件列表', description: '列出資料夾內所有案件。', inputSchema: {} }, wrap(async () => {
  const cs = listCases().map(c => { let fin = null; try { fin = compute(c).k.fin.totalWan; } catch (e) {} return { 案號: c.id, 類型: E.kindOf(c.kind).name, 標的: c.basic.addr, 委託人: c.basic.client, 價格日期: c.basic.priceDate, 總價_萬元: fin, 已簽名: !!c.signed }; });
  return out({ 資料夾: DATA_DIR, 案件數: cs.length, 案件: cs });
}));

server.registerTool('case_get', { title: '讀取案件', description: '讀取案件完整資料（JSON）。section 可只取一部分，例如 basic、parcels、comps、income、cost、land、survey、analysis、final。', inputSchema: { id: z.string(), section: z.string().optional() } },
  wrap(async ({ id, section }) => { const c = loadCase(id); return out(section ? { [section]: c[section] } : c); }));

server.registerTool('case_update', {
  title: '更新案件', description: '以 patch 深層合併更新案件；物件逐層合併，陣列（parcels、comps、income.exp 等）整個取代。不可修改簽名狀態。回傳更新後的計算摘要。',
  inputSchema: { id: z.string(), patch: anyObj.describe('例如 {"basic":{"priceDate":"2026-10-20"},"land":{"far":240}}') }
}, wrap(async ({ id, patch }) => {
  let c = loadCase(id); assertEditable(c);
  if (patch.kind && patch.kind !== c.kind) throw new Error('要改標的類型請在網頁版切換，或重新 case_create');
  c = deepMerge(c, stripLocked(patch)); saveCase(c);
  return out(Object.assign({ 已更新: id }, summary(c, compute(c))));
}));

function snapAdj(c, M){
  const inds = E.indsOf(M, c), grade = c.comp.inputMode === 'grade';
  if (!grade) return;
  const off = c.comps.some(cp => Object.keys(cp.adj || {}).some(idk => { const ind = inds.find(x => x.id === idk), a = cp.adj[idk]; if (!ind || !a) return false; const st = Number(ind.step) || 1; return Math.abs((Number(a.pct) || 0) / st - Math.round((Number(a.pct) || 0) / st)) > 1e-6 || Math.abs(Number(a.pct) || 0) > 3 * st; }));
  if (off) c.comp.inputMode = 'value';
}
server.registerTool('comps_add', {
  title: '加入比較標的', description: '加入比較標的（最多 6 件）。adj 以百分率表示各因素細項的調整（正數＝勘估標的較優），id 見 list_options。若調整率不是模型級距的整數倍，案件會改為「直接輸入」模式。replace=true 會取代現有比較標的。',
  inputSchema: {
    id: z.string(), replace: z.boolean().optional(),
    comps: z.array(z.object({
      loc: z.string(), date: z.string().describe('交易年月 YYYY-MM'), price: z.number().describe('單價 萬元/坪'), area: z.number().optional(), floor: z.string().optional(), age: z.number().optional(),
      zone: z.string().optional(), far: z.number().optional().describe('容積率 %'), priceType: z.enum(['deal', 'ask']).optional(), bargain: z.number().optional(), dataSrc: z.string().optional(),
      special: z.string().optional(), cond: z.number().optional(), condReason: z.string().optional(), adj: z.record(z.string(), z.number()).optional(), flags: z.record(z.string(), z.boolean()).optional(), weight: z.number().optional(), verifyIssue: z.string().optional()
    }))
  }
}, wrap(async ({ id, comps, replace }) => {
  const c = loadCase(id); assertEditable(c); const M = MOD(c), inds = E.indsOf(M, c);
  if (replace) c.comps = [];
  const used = () => c.comps.map(x => x.label);
  for (const s of comps){
    if (c.comps.length >= 6) throw new Error('比較標的最多 6 件');
    const lab = 'ABCDEFGH'.split('').find(l => used().indexOf(l) < 0);
    const cp = E.newComp(lab, { src: s.dataSrc || '估價師蒐集', addr: s.loc, date: s.date, unitWan: s.price, areaPing: s.area, age: s.age, far: s.far, zone: s.zone, priceType: s.priceType, bargain: s.bargain });
    if (s.floor) cp.floor = s.floor; if (s.dataSrc) cp.dataSrc = s.dataSrc;
    ['special', 'cond', 'condReason', 'weight', 'verifyIssue'].forEach(k => { if (s[k] !== undefined) cp[k] = s[k]; });
    if (s.flags) cp.flags = s.flags;
    Object.keys(s.adj || {}).forEach(k => { const ind = inds.find(x => x.id === k); if (!ind) throw new Error('因素細項 id「' + k + '」不在本案模型（' + E.kindOf(c.kind).name + '）的啟用細項中'); const st = Number(ind.step) || 1, p = s.adj[k]; cp.adj[k] = { pct: p, lv: Math.max(-3, Math.min(3, Math.round(p / st))), amt: 0 }; });
    c.comps.push(cp);
  }
  snapAdj(c, M); saveCase(c);
  return out(Object.assign({ 比較標的: c.comps.map(x => x.label + ' ' + x.loc) }, summary(c, compute(c))));
}));

server.registerTool('comps_autopick', {
  title: '自動挑選比較標的', description: '依估價模型的選取條件，從已下載的實價登錄資料挑選分數最高的 n 件作為比較標的（取代現有）。挑選後仍須逐筆查證並調整因素。',
  inputSchema: { id: z.string(), n: z.number().int().min(1).max(6).optional() }
}, wrap(async ({ id, n }) => {
  const c = loadCase(id); assertEditable(c); stateFor(c); const M = MOD(c);
  const rows = E.filteredSales(c, M).slice(0, n || Number(M.select.autoN) || 3);
  if (!rows.length) throw new Error('沒有符合條件的實價登錄資料。請先 lvr_fetch 下載該縣市資料，或確認案件的縣市、鄉鎮市區、建物型態與價格日期。');
  const each = Math.floor(100 / rows.length);
  c.comps = rows.map((x, i) => { const cp = E.newComp('ABCDEF'[i], x); cp.weight = each + (i === 0 ? 100 - each * rows.length : 0); return cp; });
  saveCase(c);
  return out({ 已挑選: rows.map(x => ({ 分數: x.score, 位置: x.addr, 年月: x.date, 單價: x.unitWan, 面積: x.areaPing, 備註: x.note })), 提醒: '請逐筆查證（§22），並以 comps_add(replace) 或 case_update 填入因素調整。' });
}));

server.registerTool('case_calculate', { title: '計算與檢核', description: '依不動產估價技術規則計算各方法價格、決定價格、逐筆土地價格與增值稅，並列出簽名前須處理事項與須敘明事項。', inputSchema: { id: z.string() } },
  wrap(async ({ id }) => { const c = loadCase(id); return out(summary(c, compute(c))); }));

server.registerTool('report_preview', { title: '報告書文字預覽', description: '以文字（Markdown）回傳完整報告書內容，【待填】標示尚缺資料。', inputSchema: { id: z.string() } },
  wrap(async ({ id }) => { const c = loadCase(id); return out(blocksToText(reportBlocks(c, compute(c)))); }));

server.registerTool('report_docx', {
  title: '產出 Word 報告書', description: '依全聯會敘述式估價報告書範本格式產出 .docx（草稿）。預設存到資料夾 reports/，可指定 out_path。',
  inputSchema: { id: z.string(), out_path: z.string().optional() }
}, wrap(async ({ id, out_path }) => {
  const c = loadCase(id), r = compute(c);
  const doc = E.REPORT.toDocx(reportBlocks(c, r), docx, { office: c.appraiser.office, caseNo: (c.report && c.report.caseNo) || c.id });
  const buf = await docx.Packer.toBuffer(doc);
  ensureDirs(); const f = out_path ? expandHome(out_path) : path.join(DIRS.reports, '估價報告書_' + c.id + (c.signed ? '' : '_草稿') + '.docx');
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf);
  return out({ 檔案: f, 位元組: buf.length, 簽名前須處理: r.v.bl.length, 說明: r.v.bl.length ? '報告仍有待處理項目，黃底文字為待填欄位。' : '檢核通過；請估價師確認後簽名。' });
}));

server.registerTool('lvr_fetch', {
  title: '下載實價登錄', description: '從內政部不動產交易實價查詢服務網下載開放資料 CSV（A 買賣、B 預售屋、C 租賃）並存入資料夾；也可給 csv_path 匯入自行下載的檔案。season 例如 115S3（民國年＋季），省略為本期。',
  inputSchema: { county: z.string().optional().describe('縣市名或代碼，例如 新北市 或 F'), types: z.array(z.enum(['A', 'B', 'C'])).optional(), season: z.string().optional(), csv_path: z.string().optional() }
}, wrap(async ({ county, types, season, csv_path }) => {
  ensureDirs(); const results = [];
  const store = (code, kind, res, src) => {
    const f = path.join(DIRS.lvr, code + '_' + kind + (season ? '_' + season : '') + '.json');
    const old = readJSON(f, { sales: [], rents: [] }), seen = new Set(old.sales.concat(old.rents).map(dedupeKey));
    const ns = res.sales.filter(x => !seen.has(dedupeKey(x))), nr = res.rents.filter(x => !seen.has(dedupeKey(x)));
    writeJSON(f, { source: src, fetched: new Date().toISOString(), sales: old.sales.concat(ns), rents: old.rents.concat(nr) });
    results.push({ 檔案: path.basename(f), 新增買賣: ns.length, 新增租賃: nr.length, 略過: res.skipped });
  };
  if (csv_path){
    const p = expandHome(csv_path), name = path.basename(p), txt = fs.readFileSync(p, 'utf8');
    const res = E.importLvr(txt, name, county ? countyCode(county)[1] : ''); if (res.error) throw new Error(res.error);
    const code = (name.match(/^([A-Za-z])_lvr/i) || [])[1] || (county ? countyCode(county)[0] : 'X');
    store(code.toUpperCase(), res.kind.toUpperCase(), res, p);
    return out({ 匯入: results });
  }
  if (!county) throw new Error('請提供 county 或 csv_path');
  const [code, name] = countyCode(county);
  for (const t of (types && types.length ? types : ['A', 'C'])){
    const fileName = code + '_lvr_land_' + t + '.csv';
    const urls = season ? ['https://plvr.land.moi.gov.tw/DownloadSeason?season=' + encodeURIComponent(season) + '&fileName=' + fileName]
      : ['https://plvr.land.moi.gov.tw/Download?fileName=' + fileName, 'https://plvr.land.moi.gov.tw/Download?type=csv&fileName=' + fileName];
    let txt = null, lastErr = null, used = null;
    for (const u of urls){ try { txt = await fetchText(u); used = u; break; } catch (e) { lastErr = e; } }
    if (!txt){ results.push({ 檔案: fileName, 錯誤: String(lastErr && lastErr.message || lastErr), 建議: '請到 https://plvr.land.moi.gov.tw/DownloadOpenData 手動下載 ' + name + ' 的 CSV，再以 csv_path 匯入。' }); continue; }
    const res = E.importLvr(txt, fileName, name); if (res.error){ results.push({ 檔案: fileName, 錯誤: res.error }); continue; }
    store(code, t, res, used);
  }
  return out({ 縣市: name, 結果: results });
}));

server.registerTool('lvr_search', {
  title: '查詢行情與候選比較標的', description: '依案件條件與估價模型的選取規則，從已下載的實價登錄資料篩選類似交易，回傳行情統計與前 limit 筆候選。',
  inputSchema: { id: z.string(), limit: z.number().int().min(1).max(60).optional() }
}, wrap(async ({ id, limit }) => {
  const c = loadCase(id); stateFor(c); const M = MOD(c), st = E.marketStats(c, M);
  return out({ 筆數: st.n, 中位數: round(st.med, 2), 第25百分位: round(st.p25, 2), 第75百分位: round(st.p75, 2), 月變動率估計: st.rate === null ? null : round(st.rate, 3),
    候選: st.rows.slice(0, limit || 15).map(x => ({ 分數: x.score, 位置: x.addr, 年月: x.date, 型態: x.type, 樓層: x.floorNum, 屋齡: x.age, 面積坪: x.areaPing, 單價: x.unitWan, 使用分區: x.zone, 備註: x.note || '' })) });
}));

server.registerTool('transcript_read', {
  title: '讀取謄本 PDF', description: '擷取登記謄本、地價謄本等 PDF 的文字，並標出地號、建號、面積、權利範圍、公告土地現值、前次移轉現值、他項權利等線索。path 可為單一檔案或資料夾。讀完請核對後用 case_update 寫入 parcels、basic.owner、basic.encumbrance 等欄位。',
  inputSchema: { path: z.string(), max_chars: z.number().int().optional() }
}, wrap(async ({ path: p, max_chars }) => {
  const P = expandHome(p), files = fs.statSync(P).isDirectory() ? fs.readdirSync(P).filter(f => /\.pdf$/i.test(f)).map(f => path.join(P, f)) : [P];
  if (!files.length) throw new Error('資料夾內沒有 PDF');
  const res = [];
  for (const f of files.slice(0, 20)){
    try { const t = await pdfText(f); res.push({ 檔案: f, 字數: t.length, 線索: transcriptHints(t), 文字: t.slice(0, max_chars || 12000), 說明: t.replace(/\s/g, '').length < 30 ? '幾乎沒有可擷取的文字（可能是掃描影像），請直接開啟 PDF 判讀。' : undefined }); }
    catch (e) { res.push({ 檔案: f, 錯誤: e.message }); }
  }
  return out(res);
}));

server.registerTool('law_lookup', {
  title: '查詢法規條文', description: '查詢不動產估價技術規則、不動產估價師法、施行細則原文（全國法規資料庫現行版本）。可指定條號或關鍵字。',
  inputSchema: { law: z.enum(['技術規則', '估價師法', '施行細則']), article: z.string().optional().describe('條號，例如 25 或 40-1'), query: z.string().optional() }
}, wrap(async ({ law, article, query }) => {
  const arts = lawArticles(law);
  if (article){ const a = arts.find(x => x.no === String(article).replace(/^第|條$/g, '').trim()); if (!a) throw new Error('查無第 ' + article + ' 條'); return out('第 ' + a.no + ' 條\n' + a.text); }
  if (query){ const hits = arts.filter(x => x.text.indexOf(query) >= 0).slice(0, 12); return out(hits.length ? hits.map(a => '第 ' + a.no + ' 條\n' + a.text).join('\n\n') : '查無含「' + query + '」的條文'); }
  return out(arts.map(a => '第 ' + a.no + ' 條：' + a.text.split('\n')[0].slice(0, 40)).join('\n'));
}));

server.registerTool('model_get', { title: '讀取估價模型', description: '讀取事務所估價模型（選取規則、因素級距、經驗調整、方法權重、收益與開發參數、報告書範本條文）。', inputSchema: { model_id: z.string().optional(), section: z.string().optional() } },
  wrap(async ({ model_id, section }) => { const M = modelById(model_id); return out(section ? { [section]: M[section] } : M); }));

server.registerTool('model_update', {
  title: '更新估價模型', description: '以 patch 深層合併更新估價模型（陣列整個取代）。§25、§26、§27 的法定門檻只能設得更嚴。會影響所有使用此模型且未簽名的案件。',
  inputSchema: { model_id: z.string(), patch: anyObj }
}, wrap(async ({ model_id, patch }) => {
  const ms = models(), i = ms.findIndex(m => m.id === model_id); if (i < 0) throw new Error('找不到模型 ' + model_id);
  const M = deepMerge(ms[i], patch), S = M.settings;
  S.lim15 = Math.min(15, Number(S.lim15) || 15); S.lim30 = Math.min(30, Number(S.lim30) || 30); S.gapLim = Math.min(20, Number(S.gapLim) || 20); S.minComps = Math.max(3, Math.round(Number(S.minComps) || 3));
  M.updated = new Date().toISOString().slice(0, 10); ms[i] = M; saveModels(ms);
  return out({ 已更新: M.name, 法定門檻: { lim15: S.lim15, lim30: S.lim30, gapLim: S.gapLim, minComps: S.minComps } });
}));

server.registerTool('case_import', {
  title: '匯入網頁版案件檔', description: '匯入網頁版「案件檔 .json」到資料夾（同案號會改用新案號）。網頁版也能直接匯入本資料夾 cases/ 內的檔案。',
  inputSchema: { path: z.string() }
}, wrap(async ({ path: p }) => {
  const o = JSON.parse(fs.readFileSync(expandHome(p), 'utf8')); let c = o.case || o; if (!c || !c.basic) throw new Error('不是案件檔');
  const ms = models(); if (o.model && o.model.id && !ms.some(m => m.id === o.model.id)){ ms.push(o.model); saveModels(ms); }
  if (!modelById(c.modelId) || modelById(c.modelId).id !== c.modelId) c.modelId = models()[0].id;
  c = deepMerge(E.blankCase(c.id, modelById(c.modelId), null, c.kind || 'unit'), c);
  if (fs.existsSync(caseFile(c.id))) c.id = nextId();
  saveCase(c); return out({ 已匯入: c.id, 檔案: caseFile(c.id) });
}));

async function main(){
  ensureDirs(); models();
  await server.connect(new StdioServerTransport());
}
main().catch(e => { console.error(e); process.exit(1); });
