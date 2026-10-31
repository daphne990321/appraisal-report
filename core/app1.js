
/* ===== 實價登錄 CSV 解析（A 買賣、B 預售屋、C 租賃） ===== */
function parseCSV(text){
  var rows=[], row=[], cell='', q=false;
  for (var i=0;i<text.length;i++){ var ch=text[i];
    if (q){ if (ch==='"'){ if (text[i+1]==='"'){ cell+='"'; i++; } else q=false; } else cell+=ch; }
    else if (ch==='"') q=true; else if (ch===','){ row.push(cell); cell=''; } else if (ch==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; } else if (ch!=='\r') cell+=ch; }
  if (cell || row.length){ row.push(cell); rows.push(row); }
  return rows;
}
function rocToYM(s){ s=String(s||'').trim(); if (!/^\d{6,7}$/.test(s)) return ''; var y=Number(s.slice(0,s.length-4))+1911, m=s.slice(-4,-2); if (Number(m)<1||Number(m)>12) return ''; return y+'-'+m; }
function cnToNum(s){ s=String(s||''); var m=s.match(/[零一二三四五六七八九十]+/); if (!m){ var d=s.match(/\d+/); return d?Number(d[0]):0; } var t=m[0], map={'零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
  if (t.indexOf('十')<0) return map[t[0]]||0; var parts=t.split('十'); return (parts[0]?map[parts[0]]:1)*10 + (parts[1]?map[parts[1]]:0); }
function matchType(t){ t=String(t||'').trim(); if (!t) return '其他'; if (BTYPES.indexOf(t)>=0) return t; var h=t.split('(')[0]; return BTYPES.find(function(x){ return x.split('(')[0]===h; }) || '其他'; }
function cleanZone(z){ return String(z||'').replace(/^都市：其他[:：]?/,'').replace(/^都市：/,'').trim(); }
function guessCounty(district, fb){ var hits=COUNTIES.filter(function(c){ return c[2].split(' ').indexOf(district)>=0; }); return hits.length===1 ? hits[0][1] : fb; }
function importLvr(text, fname, fbCounty){
  text=text.replace(/^﻿/,''); var rows=parseCSV(text); if (rows.length<2) return {error:'檔案沒有資料列'};
  var head=rows[0].map(function(h){ return h.trim(); });
  function ix(names){ for (var i=0;i<names.length;i++){ var k=head.indexOf(names[i]); if (k>=0) return k; } return -1; }
  var isRent = ix(['租賃年月日'])>=0, nk=(String(fname).match(/_([abc])\.csv$/i)||[])[1];
  var kind = isRent ? 'c' : (nk ? nk.toLowerCase() : (ix(['建案名稱'])>=0 ? 'b' : 'a'));
  var code=(String(fname).match(/^([A-Za-z])_lvr_land/i)||[])[1], cty = code && countyByCode(code) ? countyByCode(code)[1] : '';
  var need = isRent ? ['租賃年月日','總額元','建物總面積平方公尺'] : ['交易年月日','總價元','建物移轉總面積平方公尺'];
  if (need.some(function(x){ return ix([x])<0; })) return {error:'找不到「'+need.join('、')+'」欄位，請確認是內政部實價登錄開放資料的 CSV（例如 J_lvr_land_A.csv）'};
  var sales=[], rents=[], skipped=0, base=Date.now().toString(36);
  for (var r=1;r<rows.length;r++){ var R=rows[r];
    if (!R.length || (R.length===1 && !String(R[0]).trim())) continue;
    if (r===1 && /^[A-Za-z][A-Za-z ]*$/.test(String(R[0]||'').trim())) continue; /* 第二列為英文欄名 */
    var g=function(names){ var k=ix(names); return k<0 ? '' : String(R[k]||'').trim(); };
    var nm=function(names){ return Number(g(names).replace(/,/g,''))||0; };
    var dist=normTai(g(['鄉鎮市區'])), county=cty || guessCounty(dist, fbCounty||'');
    if (dist===county) dist='';
    var note=g(['備註']), zone=cleanZone(g(['都市土地使用分區'])) || g(['非都市土地使用分區']);
    var comp=rocToYM(g(['建築完成年月'])), addr=normTai(g(['土地位置建物門牌'])), floorNum=cnToNum(g(['移轉層次','租賃層次'])), tf=cnToNum(g(['總樓層數']));
    var road=(addr.replace(county,'').replace(dist,'').match(/^[^0-9０-９]*?(路|街|大道)([一二三四五六七八九十]+段)?/)||[''])[0];
    if (!isRent){
      var ym=rocToYM(g(['交易年月日'])); if (!ym){ skipped++; continue; }
      var target=g(['交易標的']);
      if (target === '土地'){
        var tl=nm(['總價元']), la=nm(['土地移轉總面積平方公尺']); if (tl<=0 || la<=0){ skipped++; continue; }
        var lp=la/3.30579;
        sales.push({id:'IL'+base+'-'+r, kind:'landsale', src:'實價登錄', imported:fname, county:county, district:dist, type:'土地', zone:zone, date:ym, floorNum:0, totalFloors:0, completed:'', age:'',
          areaPing:Math.round(lp*100)/100, unitWan:Math.round(tl/lp/10000*100)/100, totalWan:Math.round(tl/10000), park:false, note:note, special:noteToSpecial(note), presale:false, addr:addr, road:road});
        continue;
      }
      if (target && target.indexOf('建物')<0){ skipped++; continue; }
      var total=nm(['總價元']), park=nm(['車位總價元']), bA=nm(['建物移轉總面積平方公尺']), pA=nm(['車位移轉總面積(平方公尺)','車位移轉總面積平方公尺']);
      var areaM=bA-pA; if (total<=0 || areaM<=0){ skipped++; continue; }
      var ping=areaM/3.30579;
      sales.push({id:'I'+base+'-'+r, kind:'sale', src:'實價登錄', imported:fname, county:county, district:dist, type:matchType(g(['建物型態'])), zone:zone, date:ym, floorNum:floorNum, totalFloors:tf,
        completed:comp, age: comp ? ymDiffYears(comp, ym) : '', areaPing:Math.round(ping*100)/100, unitWan:Math.round((total-park)/ping/10000*100)/100, totalWan:Math.round(total/10000), park:park>0||pA>0,
        note:note, special:noteToSpecial(note), presale: kind==='b' || isPresaleNote(note), addr:addr, road:road, elevator:g(['電梯'])==='有', mgmt:g(['有無管理組織'])==='有'});
    } else {
      var ym2=rocToYM(g(['租賃年月日'])); if (!ym2){ skipped++; continue; }
      var tg=g(['交易標的']); if (tg && tg.indexOf('房屋')<0){ skipped++; continue; }
      var rent=nm(['總額元'])-nm(['車位總額元']), a2=nm(['建物總面積平方公尺'])-nm(['車位面積平方公尺']);
      if (rent<=0 || a2<=0){ skipped++; continue; }
      var p2=a2/3.30579;
      rents.push({id:'IR'+base+'-'+r, kind:'rent', src:'實價登錄', imported:fname, county:county, district:dist, type:matchType(g(['建物型態'])), zone:zone, date:ym2, floorNum:floorNum, completed:comp, age: comp ? ymDiffYears(comp, ym2) : '',
        areaPing:Math.round(p2*100)/100, rentTotal:Math.round(rent), rentPerPing:Math.round(rent/p2), furnished:g(['有無附傢俱'])==='有', lease:g(['出租型態']), note:note, addr:addr, road:road});
    }
  }
  return {sales:sales, rents:rents, skipped:skipped, kind:kind, county:cty};
}

/* ===== 狀態 ===== */
var KEY = 'appraisal-generator-v5';
var BUILTIN = parseRawJ();
var A;
function adjFrom(map){ var o={}; Object.keys(map).forEach(function(k){ o[k]={lv:map[k], pct:map[k], amt:0}; }); return o; }
function newComp(label, src){
  src = src || {};
  return {label:label, libId:src.id||'', src:src.src||'', loc:src.addr||'', floor:src.floorNum?src.floorNum+'F':'', age:src.age===undefined?'':src.age, date:src.date||'', price:src.unitWan||0, special:src.special||'', note:src.note||'', area:src.areaPing||'',
    zone:src.zone||'', far:src.far||'', priceType:src.priceType||'deal', bargain:src.bargain===undefined?10:src.bargain, dataSrc:src.src==='本所案例'?'本所案例':(src.src==='實價登錄'?'內政部實價登錄':''), shape:'', road:src.road||'',
    cond:0, condReason:'', dateManual:false, dateAdj:0, adj:{}, flags:{}, weight:0, include:true, exception:false, exceptionReason:'', verifyIssue:''};
}
function blankCase(id, M, from, kind){
  var K=M.cost, P=M.purpose['買賣參考'], fb=from&&from.basic||{}, kd=kindOf(kind||'unit'), LD=M.lda||{};
  var mw = (M.kindWeights||{})[kd.id] || P.w;
  return {
    id:id, kind:kd.id, signed:false, signedAt:'', modelId:M.id, modelSnapshot:null, subjFlags:{},
    parcels: isLandKind(kd.id) || kd.id==='hotel' || kd.id==='house' ? [{section:'', no:'', zone:'', areaM2:0, share:1, annVal:0, prevVal:0, prevDate:'', cpi:100, priceMode:'base', adjPct:0, annPct:30, unit:0, note:''}] : [],
    buildings: [],
    special:{enabled:false, label:'都市更新完成後', far:0, years:0, rateMode:'wacc', ownRatio:50, ownRate:1.7, loanRate:3.27, prem:{liquidity:0.9, risk:0.9, growth:0.9, mgmt:1.2}, rateInput:5, w:{comparison:50, land:50}},
    report:{caseNo:'', docNo:'', leader:'', surveyRefs:'登記謄本、地籍圖、都市計畫圖、現場照片', surveyConclusion:'', dataSources:'', otherBurden:'無', market:'', marketSupply:'', marketDemand:'', marketPrice:'', regionChecks:{}, methodReason:'', notUsed:{}},
    basic:{county:fb.county||'新竹縣', district:fb.district||'竹北市', road:'', addr:'', bldgNo:'', landNo:'', zone:'', btype:BTYPES[0], area:0, landShare:0, floorNum:0, totalFloors:0, completed:'', floorDesc:'', owner:'', encumbrance:'',
      purpose:'買賣參考', priceDate:'', surveyDate:'', priceType:'正常價格', conditions:'', normalPrice:'', client:'', fee:'', contractDate:'', scope:''},
    survey:{led:true, indoor:true, photos:0, useStatus:'', illegal:'none', notes:'',
      d:{traffic:'', life:'', school:'', nuisance:'', floor:'', view:'', light:'', layout:'', cond:'', mgmt:''}},
    analysis:{general:'', region:'', indiv:'', hbu:'', confirmed:false},
    methods:{comparison:kd.methods.comparison, income:kd.methods.income, cost:kd.methods.cost, land:kd.methods.land, singleReason: kd.id==='industrial' ? '勘估標的為工業區土地，區域內交易以購地自建廠房為主，租賃案例少且租金受建物型態與產業別影響甚鉅，難以規劃標準化產品，收益法與土地開發分析法均不適用，故僅以比較法評估。' : ''},
    comp:{method:'pct', inputMode:'grade', regVars:['age','floor','area','months'], volumeBasis: isLandKind(kd.id), subjFar:0},
    comps:[],
    income:{method: kd.id==='hotel'?'dcf':'direct', revMode: kd.id==='hotel'?'hotel':'rent', rooms:0, adr:0, occ:70, otherPct:5, opexPct: kd.id==='hotel'?60:0, mgmtPct: kd.id==='hotel'?1:0, rent:0, rentSource:'', vacMonths:M.income.vacMonths, incomes:[], exp:[{name:'地價稅',amt:0},{name:'房屋稅',amt:0},{name:'保險費',amt:0},{name:'維修費',amt:0},{name:'重置提撥費',amt:0}],
      costSource:'cost', manualCost:0, life:K.life, salvage:K.salvage, threeYears:true,
      capMode:'input', cap:M.income.cap, risk:{base:1.6, liquidity:0.2, risk:0.3, growth:-0.6, mgmt:0.1}, extract:[], wacc:[{name:'自有資金',w:40,k:2},{name:'借貸資金',w:60,k:2.5}],
      dcr:{dcr:1.2, rate:2.5, years:30, ltv:70}, egim:{nir:70, egim:55}, dcf:{years:10, rentGrowth:1, rentGrowth2:1, switchYear:0, expGrowth:1, disc:2.5, termCap:2, sellCost:1, deductDep:false}},
    cost:{conMethod:'unit', unitCost:K.unitCost, indexPct:100, extraLand:0, unitCostNote:'', items:[], design:K.design, extras:[], adSell:K.adSell, mgmt:K.mgmt, tax:K.tax, interest:K.interest, profit:K.profit,
      depMethod:'straight', sinkRate:2, life:K.life, salvage:K.salvage, ageManual:false, age:0, landUnit:0},
    land:{mode: isLandKind(kd.id) ? 'detailed' : 'simple', sales:[{name:'住宅',ping:0,unit:0}], floorArea:0, conUnit:K.unitCost, conIndex:100, design:LD.design||2, adSell:LD.adSell||6, mgmt:LD.mgmt||4.5, tax:LD.tax||1, profit:LD.profit||20, iMode:'table', annualRate:2.5, landRatio:60, years:3, iInput:5,
      site:0, far:0, bonus:0, freeFactor:LD.freeFactor||1.3, floorsAbove:12, floorsBelow:2, digRate:60, saleFactor:LD.saleFactor||1.75, firstFloorRatio:LD.firstFloorRatio||0.88, baseUnit:0, baseFloor:LD.baseFloor||4, util1F:LD.util1F||200, utilStep:LD.utilStep||1, utils:{}, cars:0, pingPerCar:LD.pingPerCar||18, carPrice:150,
      ownRatio:LD.ownRatio||50, ownRate:LD.ownRate||1.7, loanRate:LD.loanRate||3.27, buildMonths:28, landMonths:34},
    final:{useModelWeights:true, w:JSON.parse(JSON.stringify(mw)), reviewed:false, reason:''},
    other:'',
    appraiser:{name:'林○○', certNo:'', licenseNo:'', licenseExp:'', office:'○○不動產估價師事務所', guild:'[縣市]不動產估價師公會'}
  };
}
function draftRegion(c){ var d=c.survey.d, p=[];
  if (d.traffic) p.push('交通：'+d.traffic); if (d.life) p.push('生活機能：'+d.life); if (d.school) p.push('學區：'+d.school); if (d.nuisance) p.push('嫌惡設施：'+d.nuisance);
  return p.length ? '勘估標的所在近鄰地區，'+p.join('；')+'。' : ''; }
function draftIndiv(c){ var d=c.survey.d, p=[];
  if (d.floor) p.push('樓層：'+d.floor); if (d.view) p.push('景觀：'+d.view); if (d.light) p.push('採光通風：'+d.light); if (d.layout) p.push('格局：'+d.layout); if (d.cond) p.push('屋齡屋況：'+d.cond); if (d.mgmt) p.push('管理：'+d.mgmt);
  return p.length ? p.join('；')+'。' : ''; }
function draftHbu(c){ return '勘估標的位於'+(c.basic.zone||'[使用分區]')+'，以現行用途使用合法、實質可能、正當合理且財務可行，維持現行使用即為最有效使用（§2(17)）。'; }
function sampleCase(M){
  var c = blankCase('115-0412', M);
  c.basic = {county:'新竹縣', district:'竹北市', road:'○○路', addr:'新竹縣竹北市○○路○段○號12樓', bldgNo:'○○段 1234 建號', landNo:'○○段 567 地號', zone:'第二種住宅區', btype:BTYPES[0], area:38.5, landShare:7.82, floorNum:12, totalFloors:15,
    completed:'2018-06-20', floorDesc:'鋼筋混凝土造 15 層大樓之第 12 層', owner:'王○○（權利範圍全部）', encumbrance:'最高限額抵押權 1 筆（○○銀行，擔保債權總金額 1,560 萬元）',
    purpose:'買賣參考', priceDate:'2026-09-30', surveyDate:'2026-10-07', priceType:'正常價格', conditions:'以價格日期當時現況、無租賃關係、可正常移轉為估價條件；不含車位。',
    normalPrice:'', client:'王○○', fee:'12000', contractDate:'2026-10-02', scope:'勘估標的房地正常價格估價，出具敘述式估價報告書 1 份'};
  c.survey = {led:true, indoor:true, photos:14, useStatus:'自住，三房兩廳兩衛；2023 年整修廚房與浴室，屋況良好，無滲漏水跡象。', illegal:'none',
    notes:'委託人表示 2023 年重新裝修廚衛；同社區 10 樓 7 月剛成交；無非自然死亡紀錄。',
    d:{traffic:'距主要幹道及高鐵站車程約 10 分鐘，公車路線 2 條', life:'步行 10 分鐘內有超市、市場、診所', school:'國小、國中學區步行可達', nuisance:'500 公尺內無高壓電塔、加油站、殯葬設施',
       floor:'15 層大樓之 12 樓，中高樓層', view:'南向，前方無高樓遮蔽，可見公園綠帶', light:'三面採光，通風良好', layout:'三房兩廳兩衛，方正', cond:'屋齡約 8 年，2023 年整修廚衛，維護良好', mgmt:'有管理委員會及 24 小時保全'}};
  c.analysis = {general:'央行持續選擇性信用管制，投資需求降溫，自住需求為市場主力；新竹科學園區產業就業穩定，支撐竹北人口移入與購屋需求；2026 年以來住宅交易量較前一年減少，價格大致持平。（示意文字：正式報告須引用價格日期前的公開資料並附出處）', region:'', indiv:'', hbu:'', confirmed:true};
  c.analysis.region = draftRegion(c); c.analysis.indiv = draftIndiv(c); c.analysis.hbu = draftHbu(c);
  var A_ = newComp('A', {src:'示範', addr:'竹北市○○路一段（同社區）', floorNum:10, age:8, date:'2026-07', unitWan:52.0, areaPing:38.1}),
      B_ = newComp('B', {src:'示範', addr:'竹北市○○路二段', floorNum:15, age:6, date:'2026-05', unitWan:54.5, areaPing:41.3}),
      C_ = newComp('C', {src:'示範', addr:'竹北市○○街', floorNum:8, age:10, date:'2026-03', unitWan:48.6, areaPing:36.4, special:'親友關係人間之交易', note:'親友、員工、共有人或其他特殊關係間之交易'});
  A_.adj = adjFrom({i1:1, i2:1}); A_.weight = 45;
  B_.adj = adjFrom({i1:-1, i2:-1, i3:1, i4:-2, i6:-2}); B_.weight = 35;
  C_.cond = 3; C_.condReason = '經向買賣雙方及地政士查證，成交價低於同期市場行情約 3%';
  C_.adj = adjFrom({r1:2, r2:1, r3:2, i1:2, i2:1, i4:2, i6:1}); C_.weight = 20;
  C_.verifyIssue = '付款方式未能取得書面資料';
  c.comps = [A_, B_, C_];
  c.income.rent = 31000;
  c.income.rentSource = '依委託人提供之同社區租約及近鄰租賃行情決定';
  c.income.exp = [{name:'地價稅',amt:3200},{name:'房屋稅',amt:9800},{name:'保險費',amt:2400},{name:'維修費',amt:11160},{name:'重置提撥費',amt:5000}];
  c.income.capMode = 'extract';
  c.income.extract = [{name:'近鄰 ○○路住宅',noi:240000,price:20000000},{name:'同社區 8 樓',noi:250000,price:20000000},{name:'○○街住宅',noi:260000,price:20000000}];
  c.cost.landUnit = 150;
  c.cost.items = [{name:'結構體工程',qty:38.5,price:62000},{name:'裝修工程',qty:38.5,price:32000},{name:'水電設備工程',qty:38.5,price:18000}];
  c.land = {sales:[{name:'一樓店面',ping:120,unit:70},{name:'二樓以上住宅',ping:980,unit:52},{name:'坡道平面車位（以坪計）',ping:150,unit:12}], floorArea:1450, conUnit:16, design:2.5, adSell:4, mgmt:3, tax:1, profit:15, iMode:'formula', annualRate:2.5, landRatio:60, years:3, iInput:5};
  c.final = {useModelWeights:true, w:{comparison:80, income:20, cost:0, land:0}, reviewed:true, reason:'竹北市住宅以自住需求為主，租金收益率偏低，收益價格主要反映出租投資觀點；比較標的與勘估標的同屬一供需圈，交易資料充足且查證完整，可信度較高。估價目的為買賣參考，依本所估價模型比較價格給予 80%、收益價格 20%。'};
  c.other = '本估價不含停車位價值。\n勘估標的設有最高限額抵押權，估價金額為正常價格，未扣除債權金額。\n使用執照影本尚待委託人提供；如用途與現況不符，估價金額可能需修正。';
  c.appraiser = {name:'林○○', certNo:'[估價師證書字號]', licenseNo:'[開業證書字號]', licenseExp:'2028-03-31', office:'○○不動產估價師事務所', guild:'[縣市]不動產估價師公會'};
  return c;
}
function sampleLand(M){
  var c = blankCase('115-0420', M, null, 'land');
  c.basic = Object.assign(c.basic, {county:'新北市', district:'林口區', road:'○○路', addr:'新北市林口區○○段 101、102 地號土地', bldgNo:'', landNo:'○○段 101、102 地號', zone:'第二種住宅區', btype:'土地', area:0, landShare:0,
    owner:'○○建設股份有限公司（權利範圍全部）', encumbrance:'最高限額抵押權 1 筆（○○銀行，擔保債權總金額 20,000 萬元）', purpose:'抵押權設定', priceDate:'2026-09-30', surveyDate:'2026-09-30', priceType:'正常價格',
    conditions:'以價格日期當時土地現況為空地、依法定建蔽率 50%、容積率 150% 開發為估價條件。', client:'○○建設股份有限公司', fee:'60000', contractDate:'2026-09-25', scope:'勘估標的土地正常價格估價，出具敘述式估價報告書 1 份'});
  c.parcels = [
    {section:'○○段', no:'101', zone:'第二種住宅區', areaM2:255.68, share:1, annVal:27400, prevVal:25300, prevDate:'2019-12', cpi:105, priceMode:'base', adjPct:0, annPct:30, unit:0, note:''},
    {section:'○○段', no:'102', zone:'第二種住宅區', areaM2:1911.03, share:1, annVal:27400, prevVal:25300, prevDate:'2019-12', cpi:105, priceMode:'base', adjPct:0, annPct:30, unit:0, note:''}];
  c.comp.volumeBasis = true; c.comp.subjFar = 150;
  c.survey = {led:false, indoor:true, photos:6, useStatus:'勘察當日依現場外觀判斷為空地，地勢平坦，略呈梯形，雙面臨路。', illegal:'none', notes:'委託人未領勘，由本所人員比對地籍圖、都市計畫圖確認位置。',
    d:{traffic:'鄰近捷運站與主要幹道，公車路線多條', life:'步行範圍內有超市、學校、公園', school:'國小、國中學區步行可達', nuisance:'近鄰無危險或嫌惡設施', floor:'', view:'', light:'', layout:'', cond:'', mgmt:''}};
  c.analysis = {general:'央行選擇性信用管制持續，土建融緊縮，土地交易量較前一年減少，價格大致持平。（示意文字：正式報告須引用價格日期前的公開資料並附出處）', region:'', indiv:'勘估標的土地面積 2,166.71 平方公尺（約 655.43 坪），主要臨 20 公尺計畫道路，雙面臨路，基地略呈梯形，地勢平坦。', hbu:'勘估標的位於第二種住宅區，依法定建蔽率、容積率興建住宅大樓，即為合法、實質可能、正當合理、財務可行之最有效使用（§2(17)）。', confirmed:true};
  c.analysis.region = draftRegion(c);
  c.report.market = '區域環境內房屋空置率約 3%～5%，市場供需大致平衡；區域內第二種住宅區土地成交行情每坪約 48～56 萬元（不含容積獎勵）。';
  var mk=function(lab, addr, date, unit, ping, far, iadj, w){ var cp=newComp(lab,{src:'示範', addr:addr, date:date, unitWan:unit, areaPing:ping, far:far}); cp.adj=iadj; cp.weight=w; return cp; };
  c.comps=[ mk('A','林口區○○段 1262 地號','2026-05',50.0,276.32,150, adjFrom({L_i12:0,L_i11:0,L_i2:1}), 47),
            mk('B','林口區○○段 522 地號','2025-11',52.0,304.57,150, adjFrom({}), 21),
            mk('C','林口區○○段 512 地號等','2025-11',52.0,644.93,150, adjFrom({L_i2:-1,L_i11:-1}), 32)];
  c.land = Object.assign(c.land, {mode:'detailed', site:0, far:150, bonus:0, floorsAbove:12, floorsBelow:2, digRate:60, baseUnit:43.1, carPrice:195, conUnit:13.2, conIndex:100, buildMonths:28, landMonths:34});
  c.final = {useModelWeights:true, w:{comparison:50,income:0,cost:0,land:50}, reviewed:true, reason:'比較法採同一供需圈內近期土地成交案例，資料可信度高；土地開發分析法反映勘估標的依法定強度開發之效益，兩者均有依據，各賦予 50% 權重。'};
  c.other='本估價不考慮土地上可能存在之地下物及土壤污染。';
  c.appraiser = {name:'林○○', certNo:'[估價師證書字號]', licenseNo:'[開業證書字號]', licenseExp:'2028-03-31', office:'○○不動產估價師事務所', guild:'[縣市]不動產估價師公會', guildNo:'[公會會員證書字號]'};
  return c;
}
function sampleHotel(M){
  var c = blankCase('115-0431', M, null, 'hotel');
  c.basic = Object.assign(c.basic, {county:'高雄市', district:'前金區', road:'○○路', addr:'高雄市前金區○○路○號（○○飯店）', bldgNo:'○○段 2111～2122 建號', landNo:'○○段 1628 地號', zone:'第五種商業區', btype:'其他', area:1821.17, landShare:132.49, floorNum:0, totalFloors:11,
    completed:'2000-08-28', floorDesc:'鋼筋混凝土造地上 11 層、地下 2 層，客房 115 間', owner:'○○開發股份有限公司（權利範圍全部）', encumbrance:'最高限額抵押權 2 筆（○○銀行，合計擔保債權 33,000 萬元）', purpose:'買賣參考', priceDate:'2026-09-30', surveyDate:'2026-09-30',
    conditions:'以價格日期當時旅館營運現況、不考慮經營權與所有權分屬不同主體之影響為估價條件。', client:'○○國際股份有限公司', fee:'150000', contractDate:'2026-09-20', scope:'勘估標的房地正常價格估價'});
  c.parcels = [{section:'○○段', no:'1628', zone:'第五種商業區', areaM2:438, share:1, annVal:150000, prevVal:120000, prevDate:'2015-06', cpi:110, priceMode:'manual', adjPct:0, annPct:100, unit:0, note:''}];
  c.income = Object.assign(c.income, {method:'dcf', revMode:'hotel', rooms:115, adr:2300, occ:67, otherPct:5, opexPct:60, mgmtPct:1, rentSource:'客房數 115 間 × 平均房價 2,300 元 × 住房率 67%，參考同區同級旅館與觀光署統計',
    exp:[{name:'地價稅',amt:305529},{name:'房屋稅',amt:1875282},{name:'保險費',amt:210384},{name:'維修費',amt:643126},{name:'重置提撥費',amt:1607816}], costSource:'cost', life:50, salvage:0,
    dcf:{years:10, rentGrowth:2.5, rentGrowth2:1, switchYear:5, expGrowth:0, disc:3.18, termCap:4.28, sellCost:1, deductDep:false}});
  c.cost = Object.assign(c.cost, {conMethod:'unit', unitCost:21.94, indexPct:103.09, design:2, adSell:5, mgmt:4, tax:1, interest:2.99, profit:20, life:50, salvage:0, ageManual:true, age:26, landUnit:148.4,
    extras:[{name:'旅館裝修裝潢（2015 年完成）',amt:50432490, depPct:2}], extraLand:2728000, unitCostNote:'全聯會營造或施工費標準表（高雄市 11 層 RC 38,700 元/㎡），另加旅館設備 4,000 元/㎡'});
  c.methods = {comparison:false, income:true, cost:true, land:false, singleReason:''};
  c.survey = {led:true, indoor:true, photos:12, useStatus:'旅館營業中，地下 2 層為會議室、地下 1 層為餐廳、1 樓大廳、2～11 樓客房 115 間，維護良好。', illegal:'none', notes:'領勘人為飯店人員，提供最近兩年營業收入與費用報表。', d:{traffic:'臨 30 公尺主要道路，鄰近捷運站',life:'商圈成熟',school:'',nuisance:'無重大嫌惡設施',floor:'',view:'',light:'',layout:'',cond:'建物 2015 年全面整修',mgmt:'自營'}};
  c.analysis = {general:'國旅與入境旅客回升，觀光旅館住房率回到疫情前水準。（示意文字）', region:'', indiv:'土地三面臨路，面前道路寬約 30 公尺，長方形，地勢平坦；第五種商業區，建蔽率 70%、容積率 840%。', hbu:'勘估標的依現況作旅館使用，符合最有效使用。', confirmed:true};
  c.analysis.region = draftRegion(c);
  c.final = {useModelWeights:true, w:{comparison:0,income:50,cost:50,land:0}, reviewed:true, reason:'成本價格反映土地與建物重建成本，收益價格反映旅館營運收益能力，考量現況條件、未來性及市場發展，兩者賦予相同權重。'};
  c.appraiser = {name:'林○○', certNo:'[估價師證書字號]', licenseNo:'[開業證書字號]', licenseExp:'2028-03-31', office:'○○不動產估價師事務所', guild:'[縣市]不動產估價師公會', guildNo:'[公會會員證書字號]'};
  return c;
}
function fresh(){
  var m1=defaultModel('m1','本所標準模型',false), m2=defaultModel('m2','抵押貸款保守模型',true);
  return {v:5, models:[m1,m2], imported:{sales:[], rents:[]}, own:ownCases(), hideBuiltin:false,
    cases:[sampleCase(m1), sampleLand(m1), sampleHotel(m1)], caseId:'115-0412', tab:'report', dataSub:'subject', paramSub:'model', pModel:'m1', role:'appraiser', side:true, ui:{}};
}
function load(){ try { var raw = localStorage.getItem(KEY); if (raw){ var o = JSON.parse(raw); if (o && o.v===5 && o.cases && o.cases.length && o.models && o.models.length){ o.ui={}; return o; } } } catch(e){} return fresh(); }
var saveT = null;
function save(){ clearTimeout(saveT); saveT = setTimeout(function(){ try { localStorage.setItem(KEY, JSON.stringify(A, function(k,v){ return k==='ui' ? undefined : v; })); } catch(e){} }, 300); }

/* ===== 工具 ===== */
function esc(x){ return String(x==null?'':x).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];}); }
function fmt(v,d){ if (v===null||v===undefined||v===''||isNaN(v)) return '—'; return Number(v).toLocaleString('zh-TW',{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); }
function pct(v,d){ if (v===null||v===undefined||isNaN(v)) return '—'; v=Number(v); var s=Math.abs(v).toFixed(d===undefined?1:d); return (v>0?'+':v<0?'−':'')+s+'%'; }
function sgn(v,d){ v=Number(v)||0; return (v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d===undefined?2:d); }
function cls(v){ return v>0?'pos':v<0?'neg':''; }
function cur(){ return A.cases.find(function(c){return c.id===A.caseId;}) || A.cases[0]; }
function L(){ return cur().signed; }
function D(){ return L() ? ' disabled' : ''; }
function ph(t){ return '<span class="ph">'+esc(t)+'</span>'; }
function isM(){ return window.matchMedia && window.matchMedia('(max-width:760px)').matches; }
function toast(m){ var t=document.getElementById('toast'); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(function(){t.hidden=true;},3200); }
function modelById(id){ return A.models.find(function(m){ return m.id===id; }) || A.models[0]; }
function MOD(c){ c=c||cur(); return (c.signed && c.modelSnapshot) ? c.modelSnapshot : modelById(c.modelId); }
function purposeRule(c,M){ return (M.purpose && M.purpose[c.basic.purpose]) || {w:{comparison:80,income:20,cost:0,land:0}, capFloor:0, expMult:1}; }
function setKey(c){ return kindOf(c && c.kind).set; }
function indAll(M, c){ var k=setKey(c); return (M.indicatorSets && M.indicatorSets[k]) || (k==='bldg' ? M.indicators : defaultIndicatorSet(k)); }
function indsOf(M, c){ return indAll(M, c||cur()).filter(function(x){ return x.on; }); }
function expOf(M, c){ var k=setKey(c||cur()); return (M.exp||[]).filter(function(x){ return x.on && (!x.sets || x.sets.indexOf(k)>=0); }); }
function rootOf(p){ return p==='c'?cur():p==='m'?MOD(cur()):p==='p'?modelById(A.pModel):p==='a'?A:null; }
function getP(path){ var ps=path.split('.'), o=rootOf(ps[0]); for (var i=1;i<ps.length;i++){ if(o==null) return undefined; o=o[ps[i]]; } return o; }
function setP(path,v){ var ps=path.split('.'), o=rootOf(ps[0]); for (var i=1;i<ps.length-1;i++){ if(o[ps[i]]==null) o[ps[i]]={}; o=o[ps[i]]; } o[ps[ps.length-1]]=v; }
function fid(p){ return 'f_'+p.replace(/[^\w]/g,'_'); }
function lockAttr(o){ return o && o.free ? '' : D(); }
function F(label, path, o){
  o=o||{}; var v=getP(path), id=fid(path); if (o.lines && Array.isArray(v)) v=v.join('\n');
  var a=' id="'+id+'" data-b="'+path+'"'+(o.lines?' data-lines="1"':'')+(o.num?' data-n="1"':'')+(o.rr?' data-rr="1"':'')+lockAttr(o);
  var ctl;
  if (o.sel) ctl='<select class="inp"'+a+'>'+o.sel.map(function(x){ var val=Array.isArray(x)?x[0]:x, lab=Array.isArray(x)?x[1]:x; return '<option value="'+esc(val)+'"'+(String(val)===String(v)?' selected':'')+'>'+esc(lab)+'</option>';}).join('')+'</select>';
  else if (o.ta) ctl='<textarea class="inp"'+a+(o.ph?' placeholder="'+esc(o.ph)+'"':'')+'>'+esc(v)+'</textarea>';
  else ctl='<input class="inp'+(o.num?' num':'')+'"'+a+' type="'+(o.type||(o.num?'number':'text'))+'"'+(o.step?' step="'+o.step+'"':'')+(o.ph?' placeholder="'+esc(o.ph)+'"':'')+' value="'+esc(v)+'">';
  return '<div><label class="lbl" for="'+id+'">'+label+'</label>'+ctl+(o.hint?'<div class="hint">'+o.hint+'</div>':'')+'</div>';
}
function SL(label, path, min, max, step, unit, o){
  o=o||{}; var v=getP(path), id=fid(path), dis=lockAttr(o);
  return '<div class="sl"><div class="sl-top"><label class="lbl" for="'+id+'">'+label+'</label><span style="display:flex;align-items:center;gap:4px"><input class="ci" id="'+id+'" type="number" step="'+step+'" data-b="'+path+'" data-n="1"'+(o.rr?' data-rr="1"':'')+' value="'+esc(v)+'"'+dis+'><span class="law">'+(unit||'')+'</span></span></div>'
   +'<input type="range" min="'+min+'" max="'+max+'" step="'+step+'" data-b="'+path+'" data-n="1"'+(o.rr?' data-rr="1"':'')+' value="'+esc(v)+'" aria-label="'+esc(String(label).replace(/<[^>]+>/g,''))+'"'+dis+'>'
   +'<div class="sl-scale"><span>'+min+'</span>'+(o.hint?'<span style="font-family:var(--f-body)">'+o.hint+'</span>':'')+'<span>'+max+'</span></div></div>';
}
function CB(label, path, o){ o=o||{}; var id=fid(path);
  return '<label style="display:flex;gap:8px;align-items:flex-start;font-size:14px;cursor:pointer" for="'+id+'"><input type="checkbox" id="'+id+'" data-b="'+path+'" data-rr="1"'+(getP(path)?' checked':'')+lockAttr(o)+' style="margin-top:4px"><span>'+label+'</span></label>'; }
function LIST(path, cols, o){
  o=o||{}; var arr=getP(path)||[], dis=lockAttr(o);
  var h='<div class="tw"><table class="t" style="min-width:'+(o.minW||420)+'px"><thead><tr>'+cols.map(function(c){return '<th'+(c.num?' class="r"':'')+'>'+c.label+'</th>';}).join('')+(o.extraHead||'')+'<th></th></tr></thead><tbody>';
  h+= arr.length ? arr.map(function(row,i){ return '<tr>'+cols.map(function(c){ var p=path+'.'+i+'.'+c.key;
      return '<td'+(c.num?' class="r"':'')+'><input class="ci'+(c.num?'':' txt')+'" '+(c.num?'type="number" step="'+(c.step||'any')+'" data-n="1"':'type="text"')+' data-b="'+p+'" value="'+esc(row[c.key])+'" aria-label="'+esc(c.label)+'"'+(c.w?' style="width:'+c.w+'px"':'')+dis+'>'+(c.suf?' <span class="law">'+c.suf+'</span>':'')+'</td>'; }).join('')
      +(o.extraCell?o.extraCell(row,i):'')
      +'<td class="r"><button class="btn ghost xs" data-act="listRm" data-path="'+path+'" data-i="'+i+'"'+dis+'>刪除</button></td></tr>'; }).join('')
    : '<tr><td colspan="'+(cols.length+2)+'" class="law">尚無項目</td></tr>';
  h+='</tbody></table></div><div><button class="btn ghost sm" data-act="listAdd" data-path="'+path+'" data-tpl="'+esc(JSON.stringify(o.tpl||{}))+'"'+dis+'>＋ '+(o.addLabel||'新增項目')+'</button></div>';
  return h;
}
function PICK(path, options, title, law){
  var v=getP(path);
  return '<div class="card"><h2>'+title+(law?' <span class="law">'+law+'</span>':'')+'</h2><div class="mpick" role="radiogroup">'+options.map(function(o){ return '<label class="opt'+(v===o[0]?' on':'')+'"><input type="radio" name="'+fid(path)+'" data-b="'+path+'" value="'+o[0]+'"'+(v===o[0]?' checked':'')+D()+'><span><b>'+o[1]+'</b><span class="law">'+o[2]+'</span></span></label>'; }).join('')+'</div></div>';
}
function SUB(key, items){ var v=A[key]; return '<div class="subtabs" role="tablist">'+items.map(function(x){ return '<button role="tab" aria-selected="'+(v===x[0])+'" class="'+(v===x[0]?'on':'')+'" data-act="sub" data-k="'+key+'" data-v="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>'; }

/* ===== 資料庫、選取規則 ===== */
function salesLib(){ return (A.hideBuiltin?[]:BUILTIN.sales).concat(A.imported.sales); }
function rentLib(){ return (A.hideBuiltin?[]:BUILTIN.rents).concat(A.imported.rents); }
function allSales(M){ var s=M.sources||{lvr:true,own:true}; return (s.lvr?salesLib():[]).concat(s.own?A.own:[]); }
function libFind(id){ return salesLib().concat(A.own).find(function(x){ return x.id===id; }); }
function pdOf(c){ return c.basic.priceDate || new Date().toISOString().slice(0,10); }
function basePing(c){ return (c.parcels||[]).filter(function(p){ return !p.priceMode || p.priceMode==='base'; }).reduce(function(a,p){ return a + (Number(p.areaM2)||0)*(p.share===undefined||p.share===''?1:Number(p.share))/3.30579; }, 0); }
function areaOf(c){ return isLandKind(c.kind) ? basePing(c) : Number(c.basic.area)||0; }
function subj(c){ var b=c.basic, land=isLandKind(c.kind); return {age: land?0:CALC.yearsBetween(b.completed,pdOf(c),true), area:areaOf(c), floor: land?0:Number(b.floorNum)||0, totalFloors:Number(b.totalFloors)||0, land:land}; }
function scoreOf(x, c, R, pd, sv){
  var m=Math.abs(CALC.monthsBetween(x.date,pd)), dA = x.age===''?Number(R.ageTol):Math.abs(Number(x.age)-sv.age);
  var dS = sv.area>0 ? Math.abs(x.areaPing-sv.area)/sv.area*100 : 0, dF = x.floorNum&&sv.floor ? Math.abs(x.floorNum-sv.floor) : Number(R.floorTol);
  var cap=function(d,t){ return Math.min(1, d/Math.max(1,Number(t)||1)); };
  var pen = Number(R.wDate)*cap(m,R.months) + Number(R.wAge)*cap(dA,R.ageTol) + Number(R.wArea)*cap(dS,R.areaTolPct) + Number(R.wFloor)*cap(dF,R.floorTol);
  var road = c.basic.road && x.road && String(x.road).indexOf(c.basic.road)>=0;
  pen += road ? 0 : Number(R.wRoad);
  return Math.max(0, Math.round(100-pen));
}
function filteredSales(c, M){
  M=M||MOD(c); var R=M.select, b=c.basic, pd=pdOf(c), sv=subj(c), zc=zoneClass(b.zone);
  return allSales(M).filter(function(x){
    if (!(x.unitWan>0)) return false;
    if (sv.land !== (x.kind==='landsale')) return false;
    if (R.sameCounty && b.county && x.county!==b.county) return false;
    if (R.sameDistrict && b.district && x.district!==b.district) return false;
    if (!sv.land && R.sameType && x.type!==b.btype) return false;
    if (R.sameZone && zc && x.zone && zoneClass(x.zone)!==zc) return false;
    var m=CALC.monthsBetween(x.date,pd); if (m<0 || m>Number(R.months)) return false;
    if (!sv.land && x.age!=='' && Math.abs(Number(x.age)-sv.age)>Number(R.ageTol)) return false;
    if (sv.area>0 && Math.abs(x.areaPing-sv.area)/sv.area*100>Number(R.areaTolPct)) return false;
    if (x.floorNum && sv.floor && Math.abs(x.floorNum-sv.floor)>Number(R.floorTol)) return false;
    if (R.excludeSpecial && x.special) return false;
    if (R.excludePresale && x.presale) return false;
    if (R.keyword && String(x.addr).indexOf(R.keyword)<0) return false;
    return true;
  }).map(function(x){ return Object.assign({}, x, {score:scoreOf(x,c,R,pd,sv)}); }).sort(function(a,b){ return b.score-a.score || b.date.localeCompare(a.date); });
}
function isWhole(x){ return !x.lease || /整棟|分層/.test(x.lease); }
function filteredRents(c, M){
  M=M||MOD(c); var R=M.rentSelect, b=c.basic, pd=pdOf(c), sv=subj(c);
  return rentLib().filter(function(x){
    if (!(x.rentPerPing>0)) return false;
    if (R.sameCounty && b.county && x.county!==b.county) return false;
    if (R.sameDistrict && b.district && x.district!==b.district) return false;
    if (R.sameType && x.type!==b.btype) return false;
    var m=CALC.monthsBetween(x.date,pd); if (m<0 || m>Number(R.months)) return false;
    if (sv.area>0 && Math.abs(x.areaPing-sv.area)/sv.area*100>Number(R.areaTolPct)) return false;
    if (R.onlyWhole && !isWhole(x)) return false;
    if (R.excludeFurnished && x.furnished) return false;
    return true;
  }).sort(function(a,b){ return b.date.localeCompare(a.date); });
}
function quantile(arr,q){ if(!arr.length) return null; var s=arr.slice().sort(function(a,b){return a-b;}), pos=(s.length-1)*q, lo=Math.floor(pos), hi=Math.ceil(pos); return s[lo]+(s[hi]-s[lo])*(pos-lo); }
function marketStats(c, M){
  var rows=filteredSales(c,M), pd=pdOf(c), u=rows.map(function(x){return x.unitWan;});
  var res={rows:rows, n:rows.length, med:quantile(u,0.5), p25:quantile(u,0.25), p75:quantile(u,0.75), mean:u.length?u.reduce(function(a,b){return a+b;},0)/u.length:null, rate:null};
  var months=Array.from(new Set(rows.map(function(x){ return x.date; })));
  if (rows.length>=6 && months.length>=3){ var X=rows.map(function(x){ return [1, -CALC.monthsBetween(x.date,pd), Number(x.age)||0]; }); var fit=CALC.ols(X, u);
    if (fit && res.mean) res.rate = fit.beta[1]/res.mean*100; res.rateFit=fit; }
  res.monthsSpan=months.length;
  return res;
}
function rentStats(c, M){
  var rows=filteredRents(c,M), u=rows.map(function(x){ return x.rentPerPing; });
  return {rows:rows, n:rows.length, med:quantile(u,0.5), p25:quantile(u,0.25), p75:quantile(u,0.75)};
}
function rowVar(x, key, pd){ if (key==='age') return Number(x.age)||0; if (key==='floor') return Number(x.floorNum)||0; if (key==='area') return Number(x.areaPing)||0; if (key==='months') return CALC.monthsBetween(x.date,pd); if (key==='totalFloors') return Number(x.totalFloors)||0; return 0; }
function regression(c, M){
  var vars=c.comp.regVars, rows=filteredSales(c,M), pd=pdOf(c);
  if (!vars.length) return {err:'請至少選一個自變數'};
  if (rows.length<=vars.length+1) return {err:'樣本數不足', n:rows.length};
  var X=rows.map(function(x){ return [1].concat(vars.map(function(v){ return rowVar(x,v,pd); })); }), y=rows.map(function(x){return x.unitWan;});
  var fit=CALC.ols(X,y); if (!fit) return {err:'無法估計（變數可能共線或沒有變異，請減少變數或放寬選取條件）', n:rows.length};
  var s=subj(c), sv={age:s.age, floor:s.floor, area:s.area, months:0, totalFloors:s.totalFloors};
  var pred=fit.beta[0]+vars.reduce(function(sum,v,i){ return sum+fit.beta[i+1]*sv[v]; },0);
  fit.vars=vars; fit.pred=pred; fit.sv=sv; fit.ok20 = {n: rows.length>=5*vars.length, r2: fit.adjR2>=0.7, p: fit.p<=0.05};
  return fit;
}

/* ===== 計算與檢核 ===== */
var MNAMES = {comparison:'比較法', income:'收益法', cost:'成本法', land:'土地開發分析法'};
function modelWeights(c, M, P){ var kw=(M.kindWeights||{})[c.kind]; return kw || P.w; }
function calc(c, Mo){
  Mo = Mo || MOD(c); var S=Mo.settings, P=purposeRule(c,Mo), land=isLandKind(c.kind), area=areaOf(c);
  var opt = {volumeBasis: land && c.comp.volumeBasis, subjFar: Number(c.comp.subjFar)||Number(c.land.far)||0};
  var comp = CALC.compCalc(c.comps, indsOf(Mo,c), S, c.basic.priceDate, c.comp.method==='diff'?'diff':'pct', c.comp.inputMode, expOf(Mo,c), c.subjFlags||{}, opt);
  var reg = c.comp.method==='reg' ? regression(c,Mo) : null;
  if (c.comp.method==='reg'){ var u = reg && !reg.err ? Math.round(reg.pred*Math.pow(10,S.unitDec))/Math.pow(10,S.unitDec) : null; comp = {rows:[], usedCount:reg&&reg.n||0, gap:0, wSum:100, unitRaw:reg&&!reg.err?reg.pred:null, unit:u}; }
  var cost = CALC.costCalc(c.cost, Number(c.basic.area)||0, Number(c.basic.landShare)||0, c.basic.completed, c.basic.priceDate, S);
  if (cost.unitRaw !== null && Number(c.basic.area) > 0){ cost.unitRaw = cost.price/Number(c.basic.area)/10000; cost.unit = CALC.roundTo(cost.unitRaw, S.unitDec); }
  var inc = CALC.incomeCalc(c.income, Number(c.basic.area)||0, cost.T, S, P.expMult);
  var ldIn = c.land; if (land && c.land.mode==='detailed' && !(Number(c.land.site)>0)) ldIn = Object.assign({}, c.land, {site:area});
  var landK = CALC.landCalc(ldIn, area, S);
  var W = c.final.useModelWeights ? modelWeights(c, Mo, P) : c.final.w, list=[], units={comparison:comp.unit, income:inc.unit, cost:cost.unit, land:landK.unit};
  ['comparison','income','cost','land'].forEach(function(m){ if (c.methods[m]) list.push({key:m, name:MNAMES[m], unit:units[m], w:Number(W[m])||0}); });
  var fin = CALC.finalCalc(list, area, S), parcels = null, special = null;
  if (land || (c.parcels||[]).length){
    parcels = CALC.parcelsCalc(c.parcels, land ? fin.unit : null, S);
    if (land){ fin.totalWan = parcels.total === null ? null : CALC.roundTo(parcels.total/10000, S.totalDec); fin.yuan = parcels.total === null ? null : Math.round(parcels.total); }
  }
  if (land && c.special && c.special.enabled && Number(c.special.far) > 0){
    var sp=c.special, compS = CALC.compCalc(c.comps, indsOf(Mo,c), S, c.basic.priceDate, 'pct', c.comp.inputMode, expOf(Mo,c), c.subjFlags||{}, {volumeBasis:true, subjFar:Number(sp.far)});
    var ldS = CALC.landCalc(Object.assign({}, ldIn, {far:Number(sp.far)}), area, S);
    var ws = (sp.w||{}), wc = c.methods.comparison ? Number(ws.comparison)||0 : 0, wl = c.methods.land ? Number(ws.land)||0 : 0, wt = wc + wl;
    var done = wt > 0 ? ((compS.unit||0)*wc + (ldS.unit||0)*wl)/wt : null;
    var wacc = Number(sp.ownRatio)/100*Number(sp.ownRate) + (1-Number(sp.ownRatio)/100)*Number(sp.loanRate), pr=sp.prem||{};
    var rate = sp.rateMode==='input' ? Number(sp.rateInput) : wacc + (Number(pr.liquidity)||0) + (Number(pr.risk)||0) + (Number(pr.growth)||0) + (Number(pr.mgmt)||0);
    var df = Number(sp.years) > 0 ? CALC.discountFactor(rate, sp.years) : 1, unitS = done === null ? null : CALC.roundTo(done*df, S.unitDec);
    var pS = CALC.parcelsCalc(c.parcels, unitS, S);
    special = {comp:compS, land:ldS, done: done===null?null:CALC.roundTo(done,S.unitDec), wacc:wacc, rate:rate, df:df, unit:unitS, parcels:pS, totalWan: pS.total===null?null:CALC.roundTo(pS.total/10000,S.totalDec)};
  }
  return {comp:comp, reg:reg, cost:cost, inc:inc, land:landK, fin:fin, mc:list.length, P:P, M:Mo, W:W, S:S, parcels:parcels, special:special, area:area, isLand:land};
}
var ITEMS15 = ['委託人','勘估標的之基本資料','價格日期及勘察日期','價格種類','估價條件','估價目的','估價金額','所有權、他項權利及其他負擔','勘估標的使用現況','法定使用管制或其他管制事項','價格形成之主要因素分析','估價方法、估算過程及價格決定理由','依本規則規定須敘明之情況','其他與估價相關之必要事項','估價師姓名及證照字號'];
var CAPNAMES = {input:'直接輸入',risk:'風險溢酬法',extract:'市場萃取法',wacc:'加權平均資金成本法',dcr:'債務保障比率法',egim:'有效總收入乘數法'};
function validate(c,k){
  var S=k.S, M=k.M, P=k.P, b=c.basic, bl=[], notes=[], warns=[], cm=c.comp.method;
  if (c.methods.comparison && cm!=='reg' && c.comps.length) notes.push({t:'區域因素及個別因素調整採'+(cm==='diff'?'差額法':'百分率法')+(c.comp.inputMode==='grade'?'，依事務所指標級距表評定等級':'')+'。', law:'§24'});
  if (c.methods.comparison && cm==='reg' && k.reg && !k.reg.err) notes.push({t:'比較法採計量模型分析法，樣本 '+k.reg.n+' 筆、自變數 '+k.reg.k+' 個，調整後判定係數 '+fmt(k.reg.adjR2,3)+'，整體顯著機率 '+(k.reg.p<0.0001?'< 0.0001':fmt(k.reg.p,4))+'。', law:'§19(7)、§20'});
  if (c.methods.comparison && cm!=='reg') c.comps.forEach(function(cp,i){ var r=k.comp.rows[i];
    if (cp.special && Number(cp.cond)!==0) notes.push({t:'比較標的 '+cp.label+' 為「'+cp.special+'」，'+(cp.condReason?cp.condReason+'，':'')+'以情況調整 '+pct(cp.cond)+' 採用。', law:'§23'});
    if (cp.verifyIssue) notes.push({t:'比較標的 '+cp.label+' '+cp.verifyIssue+'，查證有困難。', law:'§22 II'});
    if (cp.priceType==='ask') notes.push({t:'比較標的 '+cp.label+' 為擬售價格，經訪查區域成交行情，扣除議價空間 '+fmt(cp.bargain,1)+'% 後作為預估可能成交價格。', law:'§23'});
    if ((r.viol15||r.viol30) && cp.exception && cp.include!==false) notes.push({t:'比較標的 '+cp.label+' 調整率超過上限，因'+(cp.exceptionReason||'[理由待填]')+'，仍予採用。', law:'§25 但書'});
  });
  if (k.isLand && c.methods.comparison && c.comp.volumeBasis) notes.push({t:'土地比較標的之容積率與勘估標的不同，以每 100% 容積地價（容積地價）換算後再行比較調整。', law:'§24'});
  (k.parcels ? k.parcels.rows : []).forEach(function(r){ var p=r.p;
    if (p.priceMode==='announced') notes.push({t:(p.section||'')+p.no+' 地號（'+(p.zone||'')+'）因'+(p.note||'市場性低、難以比較標的及開發推估')+'，以價格日期當期公告土地現值 '+fmt(p.annPct,0)+'% 核計。', law:'§16 II(13)'});
    if (p.priceMode!=='announced' && p.priceMode!=='manual' && Math.abs(Number(p.adjPct)||0) > 15) notes.push({t:(p.section||'')+p.no+' 地號與基地條件差異較大，以基地單價調整 '+pct(p.adjPct)+'，個別因素調整超過 15%'+(p.note?'（'+p.note+'）':'')+'。', law:'§25 但書'}); });
  if (k.special) notes.push({t:'特定價格以「'+(c.special.label||'特定條件')+'」允建容積率 '+fmt(c.special.far,1)+'% 評估完成時價格，再以折現率 '+fmt(k.special.rate,2)+'% 折現 '+fmt(c.special.years,1)+' 年（折現比例 '+fmt(k.special.df*100,2)+'%）。', law:'§6 II'});
  if (!c.survey.led) notes.push({t:'委託人未領勘，勘估標的範圍依登記資料及現場判斷認定。', law:'§13 II'});
  if (!c.survey.indoor) notes.push({t:'未能進入室內勘察，室內狀況依委託人陳述及外觀推估。', law:'§13 II'});
  if (k.mc===1) notes.push({t:'本案僅採一種估價方法：'+(c.methods.singleReason||'[理由待填]'), law:'§14'});
  if (k.mc>=2 && k.fin.diff>=S.diffThreshold) notes.push({t:'各方法估算價格差異 '+fmt(k.fin.diff,1)+'%，已重新檢討並說明決定理由。', law:'§15'});
  if (b.priceType==='特定價格') notes.push({t:'本案以特定價格估價，估價條件：'+(b.conditions||'[待填]')+'；同時估計之正常價格為新臺幣 '+(b.normalPrice?fmt(b.normalPrice)+' 萬元':'[待填]')+'。', law:'§6 II'});
  if (c.methods.income && !c.income.threeYears) notes.push({t:'收益法未能蒐集最近三年間收支資料。', law:'§35 II'});
  if (c.methods.cost && c.cost.ageManual) notes.push({t:'建物已經歷年數依實際構成部分與使用狀態調整為 '+fmt(c.cost.age)+' 年。', law:'§68 II'});
  if (c.methods.cost) notes.push({t:'土地價格以比較法求取（每坪 '+fmt(c.cost.landUnit,1)+' 萬元）。', law:'§69 II'});
  if (c.methods.land && c.land.iMode==='input') notes.push({t:'資本利息綜合利率依勘估標的資本利息負擔情形直接決定為 '+fmt(c.land.iInput,2)+'%。', law:'§79 II'});
  if (c.survey.illegal==='exclude') notes.push({t:'勘估標的附有違章建築，違建部分不予評估。', law:'§103'});
  if (c.survey.illegal==='separate') notes.push({t:'依委託人要求，違建部分另行評估並分別標示價格。', law:'§103'});
  var ds='data:subject';
  if (c.methods.comparison){
    if (cm==='reg'){
      var R=k.reg; if (!R || R.err) bl.push({t:'計量模型：'+(R&&R.err||'無法估計'), law:'§20', tab:'comp'});
      else { if (!R.ok20.n) bl.push({t:'計量模型樣本 '+R.n+' 筆，需達自變數 '+R.k+' 個的 5 倍（'+(5*R.k)+' 筆）', law:'§20(1)', tab:'comp'});
        if (!R.ok20.r2) bl.push({t:'調整後判定係數 '+fmt(R.adjR2,3)+'，不得低於 0.7', law:'§20(2)', tab:'comp'});
        if (!R.ok20.p) bl.push({t:'整體顯著機率 '+fmt(R.p,4)+'，不得大於 5%', law:'§20(3)', tab:'comp'}); }
    } else {
      if (k.comp.usedCount < S.minComps) bl.push({t:'可採用的比較標的 '+k.comp.usedCount+' 件，需 '+S.minComps+' 件以上', law:'§27', tab:'comp'});
      c.comps.forEach(function(cp,i){ var r=k.comp.rows[i];
        if (cp.special && Number(cp.cond)===0 && cp.include!==false) bl.push({t:'比較標的 '+cp.label+' 屬特殊交易，須先做情況調整，無法量化則不得採用', law:'§23', tab:'comp'});
        if ((r.viol15||r.viol30) && !cp.exception && cp.include!==false) bl.push({t:'比較標的 '+cp.label+(r.viol15?' 單項或小計超過 '+S.lim15+'%':' 總調整率超過 '+S.lim30+'%')+'，已自動排除', law:'§25', tab:'comp'}); });
      if (k.comp.gap >= S.gapLim) bl.push({t:'試算價格差距 '+fmt(k.comp.gap,2)+'%，達 '+S.gapLim+'% 以上', law:'§26', tab:'comp'});
      if (k.comp.usedCount && Math.abs(k.comp.wSum-100)>0.05) bl.push({t:'比較標的權重合計 '+fmt(k.comp.wSum,1)+'%，應為 100%', law:'§27', tab:'comp'});
    }
  }
  if (c.methods.income){
    if (c.income.method==='direct' && !(k.inc.cap>0)) bl.push({t:'收益資本化率須大於 0', law:'§43', tab:'income'});
    if (c.income.method==='direct' && P.capFloor>0 && k.inc.cap>0 && k.inc.cap<P.capFloor) bl.push({t:'收益資本化率 '+fmt(k.inc.cap,2)+'% 低於估價模型「'+M.name+'」對「'+b.purpose+'」設定的下限 '+fmt(P.capFloor,2)+'%', law:'本所模型', tab:'income'});
    if (c.income.method==='dcf' && !(Number(c.income.dcf.disc)>0 && Number(c.income.dcf.termCap)>0)) bl.push({t:'DCF 須輸入折現率與期末資本化率', law:'§31、§32', tab:'income'});
    if (c.income.method==='direct' && c.income.capMode==='wacc' && Math.abs(c.income.wacc.reduce(function(s,x){return s+Number(x.w||0);},0)-100)>0.05) bl.push({t:'加權平均資金成本法的資金比例合計應為 100%', law:'§43(3)', tab:'income'});
    if (c.income.revMode!=='hotel' && !(Number(c.income.rent)>0)) bl.push({t:'收益法須輸入月租金（可在「資料匯入 › 實價登錄：租賃」套用租金行情）', law:'§36', tab:'income'});
  }
  if (c.methods.land && !(k.land.S>0)) bl.push({t:'土地開發分析法須輸入可銷售面積與單價', law:'§74、§75', tab:'land'});
  if (k.mc===0) bl.push({t:'至少要選一種估價方法', law:'§14', tab:'final'});
  if (k.mc===1 && !c.methods.singleReason) bl.push({t:'只採一種方法，須填寫情況特殊之理由', law:'§14', tab:'final'});
  if (k.isLand && !(k.area>0) && !(k.parcels && k.parcels.rows.some(function(r){ return r.ping>0; }))) bl.push({t:'請在「勘估標的」輸入至少一筆土地的地號與面積', law:'§7、§11', tab:ds});
  if (k.isLand && c.methods.comparison && c.comp.volumeBasis && !(Number(c.comp.subjFar)>0)) bl.push({t:'容積地價比較須輸入勘估標的允建容積率', law:'§24', tab:'comp'});
  if (k.isLand && c.methods.comparison && c.comp.volumeBasis) c.comps.forEach(function(cp){ if (!(Number(cp.far)>0)) bl.push({t:'比較標的 '+cp.label+' 缺容積率，無法換算容積地價', law:'§24', tab:'comp'}); });
  if (c.methods.income && c.income.revMode==='hotel' && !(Number(c.income.rooms)>0 && Number(c.income.adr)>0)) bl.push({t:'旅館收益須輸入客房數與平均房價', law:'§36', tab:'income'});
  if (b.priceType==='特定價格' && !b.normalPrice && !k.special) bl.push({t:'特定價格須同時估計正常價格', law:'§6 II', tab:ds});
  if (k.mc>=2 && k.fin.diff>=S.diffThreshold && !c.final.reviewed) bl.push({t:'各方法差異 '+fmt(k.fin.diff,1)+'%，須重新檢討並勾選', law:'§15', tab:'final'});
  if (k.mc>=2 && Math.abs(k.fin.wSum-100)>0.05) bl.push({t:'方法權重合計 '+fmt(k.fin.wSum,1)+'%，應為 100%'+(c.final.useModelWeights?'（模型對「'+b.purpose+'」的權重含未採用的方法，請勾選該方法或改手動權重）':''), law:'§15', tab:'final'});
  if ((c.methods.cost || (c.methods.income && c.income.costSource==='cost')) && (c.cost.design<2 || c.cost.design>3)) warns.push({t:'規劃設計費率 '+c.cost.design+'% 不在 2%～3% 之間', law:'§57'});
  if (Number(c.cost.salvage)>10 || Number(c.income.salvage)>10) warns.push({t:'殘餘價格率超過 10%', law:'§67'});
  if (k.cost.depNote && c.methods.cost) warns.push({t:k.cost.depNote, law:'§68'});
  if (c.modelId && !A.models.some(function(m){ return m.id===c.modelId; }) && !c.signed) warns.push({t:'本案原本使用的估價模型已刪除，暫以「'+M.name+'」計算', law:'本所模型'});
  var a=c.appraiser;
  var basicOk = k.isLand ? !!(k.parcels && k.parcels.rows.length && k.parcels.rows.every(function(r){ return r.p.no && Number(r.p.areaM2)>0; })) : !!(b.addr&&b.bldgNo&&Number(b.area)>0);
  var items=[!!b.client, basicOk, !!(b.priceDate&&b.surveyDate), !!b.priceType, !!b.conditions, !!b.purpose,
    k.fin.totalWan!==null, !!(b.owner&&b.encumbrance), !!c.survey.useStatus, !!b.zone, !!c.analysis.confirmed, !!c.final.reason && k.fin.unit!==null, true, true, !!(a.name&&a.certNo&&a.licenseNo)];
  var itemTab=[ds,ds,ds,ds,ds,ds,'final',ds,'survey',ds,'survey','final','final','final',ds];
  items.forEach(function(ok,i){ if(!ok) bl.push({t:'報告書第 '+(i+1)+' 項「'+ITEMS15[i]+'」未完成', law:'§16 II', tab:itemTab[i]}); });
  return {bl:bl, notes:notes, warns:warns, items:items};
}
function selText(M){
  var R=M.select, p=[];
  if (R.sameCounty) p.push('同縣市'); if (R.sameDistrict) p.push('同鄉鎮市區'); if (R.sameType) p.push('同建物型態'); if (R.sameZone) p.push('同使用分區類別');
  p.push('交易日期在價格日期前 '+R.months+' 個月內'); p.push('屋齡差距 '+R.ageTol+' 年以內'); p.push('面積差距 '+R.areaTolPct+'% 以內'); p.push('樓層差距 '+R.floorTol+' 層以內');
  if (R.excludeSpecial) p.push('排除備註屬特殊交易者'); if (R.excludePresale) p.push('排除預售屋交易'); if (R.keyword) p.push('地址含「'+R.keyword+'」');
  var src=[]; if (M.sources.lvr) src.push('內政部實價登錄'); if (M.sources.own) src.push('本所估價案例');
  return '比較標的依本所估價模型「'+M.name+'」之選取條件，自'+(src.join('及')||'[資料來源]')+'中篩選：'+p.join('、')+'（§12、§21）。';
}
