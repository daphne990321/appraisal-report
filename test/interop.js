/* 案件檔互通測試：網頁版／MCP 共用的 importCaseFile（匯出→匯入後計算結果不變、不修改輸入、模型衝突另存） */
const E = require('../lib/engine').load(), db = E.fresh();
const J = x => JSON.parse(JSON.stringify(x));
let n = 0; const fails = [];
function ok(cond, msg){ n++; if (!cond) fails.push(msg); }
function res(c, M){ const f = E.calc(c, M, db).fin; return JSON.stringify([f.totalWan, f.unit]); }
db.cases.forEach(c0 => db.models.forEach(M => {
  const tag = c0.id + ' / ' + M.id;
  const o = { format: 'appraisal-case', v: 5, case: J(c0), model: J(M) }; o.case.modelId = M.id;
  const before = res(o.case, M), snap = JSON.stringify(o);
  const opts = { caseExists: () => false, nextId: () => 'X-0001' };
  // A：相同模型
  const a = E.importCaseFile(o, J(db.models), opts);
  ok(a.models.length === db.models.length && !a.modelAdded, tag + ' A 不應新增模型');
  ok(a.case.modelId === M.id && res(a.case, a.models.find(m => m.id === a.case.modelId)) === before, tag + ' A 計算結果不同');
  // B：同代號但被改過（調整 settings.unitDec 與 totalDec 以外的確定影響項：把 purpose 權重／總價小數位改掉）
  const ms = J(db.models), mm = ms.find(m => m.id === M.id);
  mm.settings.totalDec = (Number(mm.settings.totalDec) || 0) === 0 ? 3 : 0; mm.settings.unitDec = (Number(mm.settings.unitDec) || 0) === 1 ? 4 : 1;
  const changed = res(o.case, mm) !== before;
  ok(changed, tag + ' B 改過的模型應使計算結果不同（測試前提）');
  if (changed){
    const b = E.importCaseFile(o, ms, opts), nm = b.models.find(m => m.id === b.case.modelId);
    ok(b.models.length === ms.length + 1 && b.modelAdded && b.modelAdded.reason === 'conflict', tag + ' B 應新增模型');
    ok(nm && nm.id !== M.id && nm.id.indexOf(M.id + '-imp-') === 0 && nm.name.indexOf('匯入自案件 ' + c0.id) > 0, tag + ' B 新模型代號／名稱');
    ok(nm && res(b.case, nm) === before, tag + ' B 新模型計算結果不同');
    ok(b.models.find(m => m.id === M.id).settings.totalDec === mm.settings.totalDec, tag + ' B 本機同代號模型被改動');
    ok(b.notes.length >= 1, tag + ' B 應有說明');
  }
  // C：案號已存在
  const c = E.importCaseFile(o, J(db.models), { caseExists: id => id === c0.id, nextId: () => 'X-0099' });
  ok(c.case.id === 'X-0099' && c.idChanged && c.idChanged.from === c0.id && c.idChanged.to === 'X-0099', tag + ' C 案號');
  // E：輸入未被修改
  ok(JSON.stringify(o) === snap, tag + ' E 輸入物件被修改');
}));
// D：不是案件檔
['{}', 'null'].forEach(s => { let msg = ''; try { E.importCaseFile(JSON.parse(s), db.models, {}); } catch(e){ msg = e.message; } ok(msg === '不是案件檔', 'D ' + s + ' 應 throw 不是案件檔'); });
// key 順序不同視為相同
{ const M = db.models[0], o = { case: J(db.cases[0]), model: J(M) }; o.case.modelId = M.id;
  const rev = {}; Object.keys(o.model).reverse().forEach(k => rev[k] = o.model[k]); rev.updated = '1999-01-01'; o.model = rev;
  const r = E.importCaseFile(o, J(db.models), {}); ok(!r.modelAdded && r.models.length === db.models.length, 'key 順序／updated 不同應視為相同模型'); }
if (fails.length){ console.log('案件檔互通：失敗 ' + fails.length + ' 項\n' + fails.join('\n')); process.exit(1); }
console.log('案件檔互通：全部通過（' + n + ' 項）');
