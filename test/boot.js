/* 載入回歸測試：把建置出的 all.js 放進最小假 DOM 執行，確認各種本機存檔狀態下「載入時不丟例外、畫面有內容」。
   背景：app3.js 結尾的 render() 會在 cloud.js 頂層 var 賦值之前執行（曾因 memberName 讀 CLOUD_MEMBERS 而整頁空白）。 */
'use strict';
const vm = require('vm'), fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'appraisal-boot-'));
let code;
try {
  cp.execFileSync('python3', [path.join(__dirname, '..', 'tools', 'build.py'), tmp], { stdio: 'pipe' });
  code = fs.readFileSync(path.join(tmp, 'all.js'), 'utf8');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

const noop = function () {};
function mkEl(id) {
  return { id: id, innerHTML: '', textContent: '', value: '', hidden: false, offsetHeight: 50, style: { setProperty: noop }, classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
    querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, setAttribute: noop, getAttribute: () => null, closest: () => null, focus: noop, click: noop, appendChild: noop, remove: noop };
}
/* store：預先放進 localStorage 的內容；回傳 vm 內容物件（含 __run 可在腳本作用域執行運算式） */
function boot(store, width) {
  const els = {};
  const doc = { activeElement: null, documentElement: { style: { setProperty: noop } }, body: { style: {}, appendChild: noop }, head: { appendChild: noop },
    getElementById: (i) => els[i] || (els[i] = mkEl(i)), querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: () => mkEl() };
  const data = Object.assign({}, store);
  const ls = { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, removeItem: (k) => { delete data[k]; },
    key: (i) => Object.keys(data)[i] || null, get length() { return Object.keys(data).length; } };
  const ctx = { document: doc, localStorage: ls, console: { log: noop, warn: noop, error: console.error }, navigator: {}, Blob: function () {}, URL: {}, FileReader: function () {},
    location: { href: '', search: '', hash: '', pathname: '' }, history: { replaceState: noop }, fetch: () => Promise.reject(new Error('no network')),
    setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop, Intl, Date,
    matchMedia: () => ({ matches: width <= 760, addEventListener: noop }) };
  ctx.window = ctx; ctx.addEventListener = noop; ctx.scrollTo = noop; ctx.open = noop; ctx.innerWidth = width;
  vm.createContext(ctx);
  vm.runInContext(code + '\n;this.__run=function(s){return eval(s)};', ctx);   // 載入時的例外直接往外丟
  ctx.__app = els.app;
  return ctx;
}

const KEYS = { data: 'appraisal-generator-v5', layout: 'appraisal-ui-case-layout' };
/* 用 fresh() 產生基底，套用 mut(A)，再依 save() 的格式序列化 */
const base = boot({}, 1360);
function seed(mut, layout) {
  const A = JSON.parse(base.__run("JSON.stringify(fresh(), function(k,v){ return (k==='ui' || k==='cloudLvr') ? undefined : v; })"));
  mut(A);
  const s = {}; s[KEYS.data] = JSON.stringify(A);
  if (layout) s[KEYS.layout] = layout;
  return s;
}
const STEPS = JSON.parse(base.__run('JSON.stringify(STAGES.map(function(s){return s[0]}))'));
const TABS = JSON.parse(base.__run('JSON.stringify(TABS.map(function(s){return s[0]}))'));
if (STEPS.length !== 7) throw new Error('步驟數不是 7：' + STEPS.length);

const scenarios = [];
function add(name, store, opts) { scenarios.push({ name, store, dirtyCheck: !!(opts && opts.dirty) }); }
add('a 空的 localStorage（第一次開啟）', {});
add('b 案件頁＋交接留言（note、noteBy）', seed(function (A) {
  A.view = 'case'; A.caseId = A.cases[0].id; A.caseMeta = A.caseMeta || {};
  A.caseMeta[A.caseId] = { assignee: null, appraiser: null, stage: 'intake', status: 'review', due: '',
    note: '請確認', noteBy: '11111111-2222-3333-4444-555555555555', noteAt: '2026-11-01T08:00:00Z' };
}), { dirty: true });
add('c 案件總覽 看板模式', seed(function (A) { A.view = 'list'; A.listMode = 'board'; }));
STEPS.forEach(function (st) {
  add('d 步驟版面 ' + st, seed(function (A) { A.view = 'case'; A.caseId = A.cases[0].id; A.step = st; A.stepCase = A.cases[0].id; }, 'steps'), { dirty: true });
});
TABS.forEach(function (t) {
  add('e 舊版分頁版面 ' + t, seed(function (A) { A.view = 'case'; A.caseId = A.cases[0].id; A.tab = t; }, 'tabs'));
});
add('f 假的登入 token（無 window.supabase）', (function () {
  const s = seed(function (A) { A.view = 'case'; A.caseId = A.cases[0].id; });
  s['sb-fake-auth-token'] = JSON.stringify({ access_token: 'x', refresh_token: 'y', expires_at: 1 });
  return s;
})());

let bad = 0;
scenarios.forEach(function (sc) {
  try {
    const ctx = boot(sc.store, 1360);
    ctx.__run('render()');
    const html = ctx.__app.innerHTML;
    if (!html || html.length < 50) throw new Error('#app 沒有內容');
    if (sc.dirtyCheck) {
      const dirty = ctx.__run('A.cases.filter(function(c){ return isDirty(c); }).map(function(c){ return c.id; })');
      if (dirty.length) throw new Error('只看畫面卻讓案件變成未儲存：' + dirty.join(','));
    }
  } catch (e) { bad++; console.log('失敗：' + sc.name + '\n  ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n  ') : e)); }
});
if (bad) { console.log('載入測試失敗（' + bad + '/' + scenarios.length + ' 個情境）'); process.exit(1); }
console.log('載入測試通過（' + scenarios.length + ' 個情境）');
