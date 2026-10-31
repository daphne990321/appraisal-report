#!/usr/bin/env node
/* 實價登錄同步程式：從內政部下載開放資料 CSV，轉成 public.lvr_records 的欄位，寫入 Supabase。
 * 由 GitHub 排程（.github/workflows/lvr-sync.yml）每月執行；也可在自己電腦上手動跑。
 *
 * 用法（在 原始碼/ 執行）
 *   node tools/lvr-sync.js --dry-run                      只下載、解析、換算，不寫 Supabase（也可用 npm run lvr:dry）
 *   node tools/lvr-sync.js                                同步最近 2 個已結束的季（需環境變數）
 *   node tools/lvr-sync.js --backfill                     補最近 12 個已結束的季
 *   node tools/lvr-sync.js --seasons 115S1,115S2          指定季別
 *   node tools/lvr-sync.js --counties J --cats C --recent 1
 *   node tools/lvr-sync.js --dry-run --from-dir <資料夾> --seasons 115S2   讀本機 <代碼>_lvr_land_<A|B|C>.csv（測試用）
 * 參數：--counties F,B,J（預設）  --cats A,B,C（預設）  --recent N（預設 2）  --keep-months 36（預設）
 * 環境變數（非 dry-run 才需要）：SUPABASE_URL、SUPABASE_SECRET_KEY（secret key 不會被印出，也不會寫進檔案）
 * 結束碼：任何檔案下載或寫入失敗 → 1（該季尚未公布不算失敗）；否則 0
 *
 * Supabase 金鑰 header 依據（官方文件 https://supabase.com/docs/guides/api/api-keys ）：
 *   「Publishable and secret keys aren't JWTs ... Send publishable and secret keys on the `apikey` header,
 *    not on `Authorization: Bearer`.」sb_secret_ 開頭的 secret key 只送 apikey，不送 Authorization。
 *   secret key 對應 service_role 權限，可繞過 RLS，因此能寫入沒有開放寫入權限的 lvr_records。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const E = require('../lib/engine.js').load();

const SLEEP_MS = 3000, RETRIES = 2, RETRY_WAIT_MS = 10000, TIMEOUT_MS = 60000, BATCH = 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 季別推算（民國年 + S + 季） ---------- */
function seasonOf(y, q){ return (y - 1911) + 'S' + q; }
/* 最近 n 個「已結束」的季：今天所在的季尚在進行中，不算 */
function recentSeasons(n, today){
  let y = today.getFullYear(), q = Math.floor(today.getMonth() / 3) + 1; const out = [];
  for (let i = 0; i < n; i++){ q--; if (q < 1){ q = 4; y--; } out.push(seasonOf(y, q)); }
  return out;
}
/* 保留的最早年月 YYYY-MM：今天往前 keepMonths 個月 */
function cutoffYM(keepMonths, today){
  const t = today.getFullYear() * 12 + today.getMonth() - keepMonths;
  return Math.floor(t / 12) + '-' + String(t % 12 + 1).padStart(2, '0');
}

/* ---------- 參數 ---------- */
function parseArgs(argv){
  const a = { counties: 'F,B,J', cats: 'A,B,C', recent: 2, keep: 36, dry: false, backfill: false, seasons: null, fromDir: null };
  for (let i = 0; i < argv.length; i++){
    const k = argv[i], v = () => { if (i + 1 >= argv.length) throw new Error('參數缺少值：' + k); return argv[++i]; };
    if (k === '--counties') a.counties = v();
    else if (k === '--cats') a.cats = v();
    else if (k === '--seasons') a.seasons = v();
    else if (k === '--recent') a.recent = parseInt(v(), 10);
    else if (k === '--keep-months') a.keep = parseInt(v(), 10);
    else if (k === '--from-dir') a.fromDir = v();
    else if (k === '--backfill') a.backfill = true;
    else if (k === '--dry-run') a.dry = true;
    else throw new Error('不認得的參數：' + k);
  }
  if (!(a.recent >= 1) || !(a.keep >= 1)) throw new Error('--recent 與 --keep-months 必須是正整數');
  return a;
}
function pickSeasons(a, today){
  if (a.seasons) return a.seasons.split(',').map(s => s.trim()).filter(Boolean);
  return recentSeasons(a.backfill ? 12 : a.recent, today);
}

/* ---------- 轉成資料表欄位 ---------- */
const numOrNull = v => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return isFinite(n) ? n : null; };
const intOrNull = (v, lim) => { const n = numOrNull(v); if (n === null) return null; const r = Math.round(n); return Math.abs(r) > (lim || 2147483647) ? null : r; };
const boolOrNull = v => (typeof v === 'boolean' ? v : null);
const strOrNull = v => (v === '' || v === null || v === undefined ? null : String(v));
function toRow(x, cat, season){
  return {
    serial: x.serial, cat: cat, season: season, county: x.county, district: x.district === undefined ? null : x.district,
    kind: x.kind, type: strOrNull(x.type), zone: x.zone === undefined ? null : x.zone, ym: x.date,
    floor_num: intOrNull(x.floorNum, 32767), total_floors: intOrNull(x.totalFloors, 32767),
    completed: strOrNull(x.completed), age: intOrNull(x.age, 32767),
    area_ping: numOrNull(x.areaPing), unit_wan: numOrNull(x.unitWan), total_wan: intOrNull(x.totalWan),
    rent_total: intOrNull(x.rentTotal), rent_per_ping: intOrNull(x.rentPerPing),
    park: boolOrNull(x.park), presale: boolOrNull(x.presale), elevator: boolOrNull(x.elevator), mgmt: boolOrNull(x.mgmt), furnished: boolOrNull(x.furnished),
    lease: strOrNull(x.lease), special: strOrNull(x.special), note: strOrNull(x.note), addr: x.addr === undefined ? null : x.addr, road: x.road === undefined ? null : x.road
  };
}

/* ---------- 下載 ---------- */
class NotPublished extends Error {}
async function download(url){
  let lastErr;
  for (let t = 0; t <= RETRIES; t++){
    if (t > 0) await sleep(RETRY_WAIT_MS);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status === 404) throw new NotPublished('該季檔案不存在（HTTP 404），視為尚未公布');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      if (/html/i.test(ct) || /^\s*<(!doctype|html)/i.test(text)) throw new NotPublished('伺服器回傳網頁而非 CSV，視為尚未公布');
      return text;
    } catch (e) { if (e instanceof NotPublished) throw e; lastErr = e; }
  }
  throw new Error('下載失敗：' + (lastErr && (lastErr.cause && lastErr.cause.code || lastErr.message)));
}

/* ---------- Supabase（PostgREST）；只送 apikey header，不送 Authorization（見檔頭依據） ---------- */
function sb(env){
  const base = env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/';
  const hdr = extra => Object.assign({ apikey: env.SUPABASE_SECRET_KEY, 'Content-Type': 'application/json' }, extra);
  async function call(method, pathq, body, prefer){
    let lastErr;
    for (let t = 0; t <= RETRIES; t++){
      if (t > 0) await sleep(RETRY_WAIT_MS);
      try {
        const res = await fetch(base + pathq, { method, headers: hdr(prefer ? { Prefer: prefer } : {}), body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) { const m = (await res.text()).slice(0, 300); if (res.status >= 400 && res.status < 500) { const e = new Error('HTTP ' + res.status + ' ' + m); e.fatal = true; throw e; } throw new Error('HTTP ' + res.status + ' ' + m); }
        return res;
      } catch (e) { lastErr = e; if (e.fatal) break; }
    }
    throw new Error('Supabase 呼叫失敗（' + method + ' ' + pathq.split('?')[0] + '）：' + (lastErr && (lastErr.cause && lastErr.cause.code || lastErr.message)));
  }
  return {
    async upsert(rows){ for (let i = 0; i < rows.length; i += BATCH) await call('POST', 'lvr_records?on_conflict=serial', rows.slice(i, i + BATCH), 'resolution=merge-duplicates,return=minimal'); },
    log: entry => call('POST', 'lvr_sync_log', entry, 'return=minimal'),
    async purge(cutoff){ const r = await call('DELETE', 'lvr_records?ym=lt.' + cutoff, undefined, 'count=exact,return=minimal'); return (r.headers.get('content-range') || '').split('/')[1] || '?'; }
  };
}

/* ---------- 主流程 ---------- */
async function main(){
  const a = parseArgs(process.argv.slice(2)), today = new Date();
  const seasons = pickSeasons(a, today), cutoff = cutoffYM(a.keep, today);
  const counties = a.counties.split(',').map(s => s.trim().toUpperCase()).filter(Boolean), cats = a.cats.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const env = process.env;
  if (!a.dry && (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY)) throw new Error('缺少環境變數 SUPABASE_URL 或 SUPABASE_SECRET_KEY（只想測試請加 --dry-run）');
  const db = a.dry ? null : sb(env);
  if (a.fromDir) seasons.splice(1); /* 本機資料夾只有一份，季別以第一個值標記 */
  console.log('季別：' + seasons.join('、') + '｜縣市：' + counties.join('、') + '｜類別：' + cats.join('、') + '｜保留 ' + cutoff + ' 以後（' + a.keep + ' 個月）｜' + (a.dry ? '試跑（不寫入）' : '正式寫入'));

  const results = []; let failed = 0, first = true;
  for (const season of seasons) for (const code of counties) for (const cat of cats){
    const fileName = code + '_lvr_land_' + cat + '.csv';
    const rec = { season, code, cat, county: '', file: fileName, parsed: 0, noSerial: 0, old: 0, kept: 0, bytes: 0, saved: 0, status: '成功', message: '' };
    results.push(rec);
    try {
      let text;
      if (a.fromDir) text = fs.readFileSync(path.join(a.fromDir, fileName), 'utf8');
      else { if (!first) await sleep(SLEEP_MS); first = false; text = await download('https://plvr.land.moi.gov.tw/DownloadSeason?season=' + season + '&fileName=' + fileName); }
      const cty = E.countyByCode ? E.countyByCode(code) : null;
      const r = E.importLvr(text, fileName, cty ? cty[1] : '');
      if (r.error) throw new NotPublished(r.error);
      rec.county = r.county || (cty && cty[1]) || code;
      const all = r.sales.concat(r.rents); rec.parsed = all.length;
      if (!all.length) throw new NotPublished('沒有可用的資料列');
      const map = new Map();
      all.forEach(x => {
        if (!x.serial){ rec.noSerial++; return; }
        if (!x.date || x.date < cutoff){ rec.old++; return; }
        map.set(x.serial, toRow(x, cat, season)); /* 同檔重複編號只留最後一筆 */
      });
      const rows = Array.from(map.values()); rec.kept = rows.length; rec.bytes = Buffer.byteLength(JSON.stringify(rows));
      if (db){ await db.upsert(rows); rec.saved = rows.length; }
    } catch (e) {
      if (e instanceof NotPublished){ rec.status = '略過'; rec.message = e.message; }
      else { rec.status = '失敗'; rec.message = e.message; failed++; }
    }
    if (!rec.county) rec.county = (E.countyByCode && E.countyByCode(code) || [])[1] || code;
    if (db){
      try { await db.log({ season, county: rec.county, cat, rows_parsed: rec.parsed, rows_saved: rec.saved, ok: rec.status !== '失敗', message: rec.message || (rec.status === '略過' ? '略過' : null) }); }
      catch (e) { console.log('  （同步紀錄寫入失敗：' + e.message + '）'); failed++; }
    }
    console.log('  ' + season + ' ' + rec.county + ' ' + cat + '：' + rec.status + (rec.message ? '（' + rec.message + '）' : '') + '，解析 ' + rec.parsed + '，保留 ' + rec.kept);
  }

  /* 摘要表 */
  const kb = n => (n / 1024).toFixed(1) + ' KB';
  console.log('\n===== 摘要 =====');
  console.log(['季別', '縣市', '類別', '解析筆數', '編號空白', '超過期限略過', '保留筆數', '估計大小', '已寫入', '狀態'].join('\t'));
  const tot = { parsed: 0, noSerial: 0, old: 0, kept: 0, bytes: 0, saved: 0 };
  results.forEach(r => {
    Object.keys(tot).forEach(k => { tot[k] += r[k]; });
    console.log([r.season, r.county, r.cat, r.parsed, r.noSerial, r.old, r.kept, kb(r.bytes), r.saved, r.status + (r.message ? '：' + r.message : '')].join('\t'));
  });
  console.log(['合計', '', '', tot.parsed, tot.noSerial, tot.old, tot.kept, kb(tot.bytes), tot.saved, '失敗 ' + failed + ' 個，略過 ' + results.filter(r => r.status === '略過').length + ' 個'].join('\t'));

  /* 清理過期資料（只有全部沒有失敗才做，避免失敗時資料變少） */
  if (db){
    if (failed) console.log('\n有失敗項目，本次不清理過期資料。');
    else { try { console.log('\n清理 ym < ' + cutoff + ' 的過期資料：刪除 ' + await db.purge(cutoff) + ' 筆'); } catch (e) { console.log('\n清理過期資料失敗：' + e.message); failed++; } }
  }
  if (failed) process.exitCode = 1;
}

module.exports = { recentSeasons, cutoffYM, seasonOf, toRow };
if (require.main === module) main().catch(e => { console.error('錯誤：' + e.message); process.exit(1); });
