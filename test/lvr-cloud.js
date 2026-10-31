/* P3-5 雲端實價登錄：lvrRowToRecord、salesLib 合併／去重、filteredSales 選取 */
'use strict';
const E = require('../lib/engine').load();
let n = 0, bad = 0;
function ok(cond, msg){ n++; if (!cond){ bad++; console.log('失敗：' + msg); } }
function row(o){ return Object.assign({serial:'', cat:'A', county:'新竹縣', district:'竹北市', kind:'sale', type:'住宅大樓(11層含以上有電梯)', zone:'住', ym:'2026-06', floor_num:8, total_floors:15, completed:'2015-03', age:11, area_ping:40, unit_wan:35, total_wan:1400, rent_total:null, rent_per_ping:null, park:true, presale:false, elevator:true, mgmt:true, furnished:null, lease:null, special:'', note:null, addr:'新竹縣竹北市縣政九路1號', road:'縣政九路'}, o); }
const rows = [
  row({serial:'HC001'}), row({serial:'HC002', ym:'2026-05', area_ping:42, unit_wan:33.5, age:null, completed:null}),
  row({serial:'HC003', ym:'2026-04', district:'竹東鎮'}),
  row({serial:'NT001', county:'新北市', district:'板橋區', unit_wan:55}), row({serial:'NT002', county:'新北市', district:'板橋區', unit_wan:60}),
  row({serial:'HC101', cat:'C', kind:'rent', unit_wan:null, total_wan:null, park:null, presale:null, elevator:null, mgmt:null, rent_total:30000, rent_per_ping:750, furnished:false, lease:'整層住家'}),
  row({serial:'NT101', cat:'C', county:'新北市', district:'板橋區', kind:'rent', unit_wan:null, total_wan:null, rent_total:28000, rent_per_ping:700, furnished:true, lease:'整層住家'})
];
const recs = rows.map(E.lvrRowToRecord);
const sales = recs.filter(r => r.kind === 'sale'), rents = recs.filter(r => r.kind === 'rent');
/* 轉換結果 */
ok(sales[0].id === 'LHC001' && sales[0].src === '實價登錄' && sales[0].date === '2026-06' && sales[0].unitWan === 35 && sales[0].presale === false && sales[0].park === true, 'lvrRowToRecord 買賣欄位');
ok(sales[1].age === '' && sales[1].completed === '' && sales[1].note === '', 'null 轉預設值');
ok(rents[0].rentPerPing === 750 && rents[0].rentTotal === 30000 && rents[0].furnished === false && rents[0].lease === '整層住家', 'lvrRowToRecord 租賃欄位');
/* a. 雲端取代同縣市內建 */
const base = E.fresh(), nb = E.salesLib(base).length, nbR = E.rentLib(base).length;
ok(nb > 0 && E.salesLib(base).every(x => x.county === '新竹縣'), '內建為新竹縣樣本');
const db = E.fresh(); db.cloudLvr = {sales, rents, counties:['新竹縣']};
const sl = E.salesLib(db);
ok(sl.length === sales.length, '含雲端、不含內建新竹縣：' + sl.length);
ok(!sl.some(x => !x.serial), '無內建資料');
ok(sl.some(x => x.serial === 'NT001'), '含新北雲端資料');
ok(E.rentLib(db).length === rents.length, 'rentLib 同理');
/* 雲端縣市不含新竹縣時，內建仍在 */
const db2 = E.fresh(); db2.cloudLvr = {sales:sales.filter(x => x.county === '新北市'), rents:[], counties:['新北市']};
ok(E.salesLib(db2).length === nb + 2, '其他縣市雲端不影響內建');
/* b. 同 serial 只出現一次，雲端優先 */
const db3 = E.fresh(); db3.cloudLvr = {sales, rents, counties:['新竹縣']};
db3.imported.sales.push(Object.assign({}, sales[0], {id:'Iold-1', unitWan:1}), Object.assign({}, sales[0], {id:'Iold-2', serial:'', unitWan:2}));
const sl3 = E.salesLib(db3).filter(x => x.serial === 'HC001');
ok(sl3.length === 1 && sl3[0].id === 'LHC001' && sl3[0].unitWan === 35, '同 serial 去重且雲端優先');
ok(E.salesLib(db3).length === sales.length + 1, '無 serial 的匯入資料保留');
/* c. 沒有 cloudLvr 時不變 */
const db4 = E.fresh(); db4.imported.sales.push(Object.assign({}, sales[0], {id:'Ix'}));
ok(E.salesLib(db4).length === nb + 1 && E.salesLib(db4).slice(0, nb).every((x, i) => x === E.BUILTIN.sales[i]) && E.rentLib(db4).length === nbR, '沒有 cloudLvr 時與原本相同');
/* d. filteredSales */
const M = E.fresh().models[0], c = E.sampleCase(M);
ok(c.id === '115-0412' && c.basic.county === '新竹縣' && c.basic.district === '竹北市', '範例案件 115-0412');
const hit = E.filteredSales(c, M, db).filter(x => x.src === '實價登錄'); /* 排除本所案例 */
ok(hit.length > 0 && hit.every(x => x.id.indexOf('L') === 0), '實價登錄只選到雲端資料，筆數 ' + hit.length);
ok(hit.some(x => x.serial === 'HC001') && !hit.some(x => x.serial === 'HC003' || x.county === '新北市'), '同區同縣市篩選');
console.log(bad ? '雲端實價登錄：' + bad + ' 項失敗' : '雲端實價登錄：全部通過（' + n + ' 項）');
process.exit(bad ? 1 : 0);
