
/* ===== 報告書 ===== */
function nl(t){ return esc(t).replace(/\n/g,'<br>'); }
function V(x, p){ return x ? esc(x) : ph(p||'待填'); }
function reportHtml(c,k,v){
  return (c.signed?'':'<p class="small" style="text-align:center;color:var(--warn);margin:0 0 8px">草稿（黃底為待填欄位）</p>') + REPORT.toHTML(reportBlocks(c,k,v));
}
function capDetail(I, ic){
  var m=I.capMode;
  if (m==='risk'){ var R=I.risk; return '<p>收益資本化率以風險溢酬法決定：基準報酬率 '+fmt(R.base,2)+'%，加計流通性 '+sgn(R.liquidity)+'%、風險性 '+sgn(R.risk)+'%、增值性 '+sgn(R.growth)+'%、管理難易 '+sgn(R.mgmt)+'%（§43(1)）。</p>'; }
  if (m==='extract') return '<p>收益資本化率以市場萃取法決定（§43(2)）：</p><table><thead><tr><th>比較標的</th><th>淨收益（元）</th><th>價格（元）</th><th>淨收益率</th></tr></thead><tbody>'+I.extract.map(function(x){ return '<tr><td>'+esc(x.name)+'</td><td class="r">'+fmt(x.noi)+'</td><td class="r">'+fmt(x.price)+'</td><td class="r">'+(Number(x.price)>0?fmt(x.noi/x.price*100,2)+'%':'—')+'</td></tr>'; }).join('')+'<tr><th colspan="3">平均</th><td class="r">'+fmt(ic.cap,2)+'%</td></tr></tbody></table>';
  if (m==='wacc') return '<p>收益資本化率以加權平均資金成本法決定（§43(3)）：'+I.wacc.map(function(x){return esc(x.name)+' '+fmt(x.w,1)+'% × '+fmt(x.k,2)+'%';}).join('；')+'。</p>';
  if (m==='dcr'){ var d=I.dcr; return '<p>收益資本化率以債務保障比率法決定（§43(4)）：債務保障比率 '+fmt(d.dcr,2)+' × 貸款常數 '+fmt(CALC.loanConstant(d.rate,d.years),4)+'（利率 '+fmt(d.rate,2)+'%、'+d.years+' 年）× 貸款資金占價格比率 '+fmt(d.ltv,0)+'%。</p>'; }
  if (m==='egim') return '<p>收益資本化率以有效總收入乘數法決定（§43(5)）：淨收益率 '+fmt(I.egim.nir,1)+'% ÷ 有效總收入乘數 '+fmt(I.egim.egim,1)+'。</p>';
  return '';
}
function reportPane(c,k,v){
  var canSign = !c.signed && v.bl.length===0 && A.role==='appraiser';
  return '<div class="rtool"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
   +(c.signed?'<span class="chip ok">已簽名交付</span>':'<span class="chip '+(v.bl.length?'warn':'ok')+'">'+(v.bl.length?'待處理 '+v.bl.length+' 項':'檢核通過')+'</span>')
   +'<span class="chip info">必載 '+v.items.filter(Boolean).length+'/15</span>'+(v.warns.length?'<span class="chip warn">提醒 '+v.warns.length+'</span>':'')+'<span class="chip info">'+esc(kindOf(c.kind).name)+'</span><span class="chip info">'+esc(k.M.name)+'</span></div>'
   +'<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="docx">下載 Word</button><button class="btn ghost sm" data-act="copy">複製全文</button><button class="btn ghost sm" data-act="download">下載 .html</button><button class="btn ghost sm" data-act="exportCase">案件檔 .json</button>'
   +(c.signed?'':'<button class="btn seal sm" data-act="sign"'+(canSign?'':' disabled')+' title="'+(A.role!=='appraiser'?'助理員不能簽名':v.bl.length?'仍有待處理項目':'簽名後鎖定')+'">估價師簽名交付</button>')+'</div></div>'
   +((v.bl.length||v.warns.length)&&!c.signed?'<div style="background:var(--surface);border-inline:1px solid var(--line);padding:4px 12px 10px"><details'+(A.tab==='report'?' open':'')+'><summary style="cursor:pointer;font-size:13.5px;padding:6px 0">簽名前須處理（'+v.bl.length+'）'+(v.warns.length?'與提醒（'+v.warns.length+'）':'')+'</summary><ul style="margin:4px 0 0;padding-left:18px;font-size:13px;display:flex;flex-direction:column;gap:4px">'
     +v.bl.map(function(x){return '<li><button class="btn ghost xs" style="min-height:0;border:0;padding:0;color:var(--accent);background:transparent;white-space:normal;text-align:left;font-size:13px" data-act="goTab" data-v="'+x.tab+'">'+esc(x.t)+'</button> <span class="law">'+x.law+'</span></li>';}).join('')
     +v.warns.map(function(x){return '<li style="color:var(--warn)">'+esc(x.t)+' <span class="law">'+x.law+'</span></li>';}).join('')+'</ul></details></div>':'')
   +'<article class="paper">'+reportHtml(c,k,v)+'</article>';
}

/* ===== 即時輸出 ===== */
function line2(rows){ return rows.map(function(x){return '<div class="ck"><span>'+x[0]+'</span><span class="num">'+(typeof x[1]==='string'?x[1]:(x[1]<0?'−':'')+fmt(Math.abs(x[1])))+'</span></div>';}).join(''); }
function U(v,d){ return v!==null&&v!==undefined? fmt(v,d)+' <span style="font-size:14px;color:var(--band-muted)">萬元/坪</span>':'—'; }
function outs(){
  var c=cur(), k=calc(c), S=k.S, o={}, cc=k.comp, isD=c.comp.method==='diff', area=k.area;
  (cc.rows||[]).forEach(function(r,i){
    o['date-'+i]=pct(r.date); o['rs-'+i]='<span class="'+cls(r.r)+'">'+(isD?sgn(r.rv):pct(r.r))+'</span>'; o['is-'+i]='<span class="'+cls(r.i)+'">'+(isD?sgn(r.iv):pct(r.i))+'</span>';
    o['tot-'+i]=fmt(r.total,1)+'%'; o['trial-'+i]=fmt(r.trial,2); o['w-'+i]=r.usable?fmt(r.weight,1)+'%':'—'; o['abs-'+i]=fmt(r.absSum,1); o['vp-'+i]=r.volPrice===null||r.volPrice===undefined?'—':fmt(r.volPrice,2);
    r.items.forEach(function(it){ if (it.exp) o[it.id.replace(':','-')+'-'+i]='<span class="'+cls(it.pct)+'">'+(isD?sgn(it.v):pct(it.pct))+'</span>'; });
    var cp=c.comps[i];
    o['st-'+i]= cp.include===false?'<span class="chip info">未採用</span>':r.specialUnadjusted?'<span class="chip fail">特殊交易未調整</span>':(r.viol15||r.viol30)?(cp.exception?'<span class="chip warn">但書採用</span>':'<span class="chip fail">超過上限，排除</span>'):'<span class="chip ok">採用</span>';
  });
  var mi=0,ms=0,mt=0; (cc.rows||[]).forEach(function(r){ if(!r.usable) return; mi=Math.max(mi,r.maxItem); ms=Math.max(ms,Math.abs(r.r),Math.abs(r.i)); mt=Math.max(mt,r.total); });
  function cr(l,law,ok,val){ return '<div class="ck"><div>'+l+'<div class="law">'+law+'</div></div><span class="chip '+(ok?'ok':'fail')+'">'+val+'</span></div>'; }
  o.compChecks = cr('採用比較標的 ≥ '+S.minComps+' 件','§27',cc.usedCount>=S.minComps,cc.usedCount+' 件')
   + cr('小計及單項 ≤ '+S.lim15+'%','§25',Math.max(mi,ms)<=S.lim15,'最大 '+fmt(Math.max(mi,ms),1)+'%')
   + cr('總調整率 ≤ '+S.lim30+'%','§25（'+(S.totalMode==='abs'?'絕對值加總':'連乘淨變動')+'）',mt<=S.lim30,'最大 '+fmt(mt,1)+'%')
   + cr('試算價格差距 < '+S.gapLim+'%','§26',cc.gap<S.gapLim,fmt(cc.gap,2)+'%')
   + cr('權重合計 100%','§27',Math.abs(cc.wSum-100)<=0.05,fmt(cc.wSum,1)+'%');
  o.compUnit = U(cc.unit,S.unitDec);
  o.compTotal = cc.unit!==null&&cc.unitRaw!==null? '加權 '+fmt(cc.unitRaw,3)+'；× '+fmt(area,2)+' 坪 ＝ '+fmt(cc.unit*area,2)+' 萬元':'比較標的或權重不足';
  var ic=k.inc, I=c.income;
  o.capOut=' <span class="chip '+(k.P.capFloor>0&&ic.cap<k.P.capFloor?'fail':'info')+'">'+fmt(ic.cap,2)+'%</span>';
  o.loanK=fmt(CALC.loanConstant(I.dcr.rate,I.dcr.years),4);
  var revRows = ic.hotel ? [['客房收入（'+fmt(I.rooms)+' 間 × '+fmt(I.adr)+' 元 × 365 × '+fmt(I.occ,1)+'%）',ic.roomRev],['其他營業收入（'+fmt(I.otherPct,1)+'%）',ic.roomRev*Number(I.otherPct||0)/100],['其他收入',ic.other]] : [['年租金收入',ic.rent*12],['其他收入',ic.other],['閒置及收租損失',-ic.loss]];
  o.incTable = line2(revRows.concat([['有效總收入',ic.egi],['固定費用'+(Number(ic.expMult)!==1?'（× '+fmt(ic.expMult,2)+'）':''),-(ic.expRaw*ic.expMult)]]).concat(ic.pctPart?[['營業費用、管理費（比例）',-ic.pctPart]]:[]).concat([['建物折舊提存費',-ic.dep],['淨收益（第 1 年）',ic.noi]]).concat(I.method==='direct'?[['收益資本化率',fmt(ic.cap,2)+'%'],['收益價格（元）',ic.price===null?'—':ic.price]]:[['各期淨收益現值',ic.terminal?ic.terminal.pvFlows:0],['期末價值現值',ic.terminal?ic.terminal.pv:0],['收益價格（元）',ic.price]]))+'<div class="hint">建物總成本 '+fmt(ic.buildCost)+' 元</div>';
  o.incUnit = U(ic.unit,S.unitDec);
  o.incTotal = ic.price!==null? fmt(ic.price/10000,2)+' 萬元':'請完成收益資本化率';
  if (ic.flows) o.dcfTable='<div class="tw"><table class="t" style="min-width:520px"><thead><tr><th>年</th><th class="r">有效總收入</th><th class="r">費用</th><th class="r">淨收益</th><th class="r">現值</th></tr></thead><tbody>'+ic.flows.map(function(f){return '<tr><td class="num">'+f.k+'</td><td class="r num">'+fmt(f.egi)+'</td><td class="r num">'+fmt(f.exp+f.dep)+'</td><td class="r num">'+fmt(f.cf)+'</td><td class="r num">'+fmt(f.pv)+'</td></tr>';}).join('')+'<tr class="sum"><td>期末</td><td colspan="3" class="r">期末價值 '+fmt(ic.terminal.value)+'</td><td class="r num">'+fmt(ic.terminal.pv)+'</td></tr></tbody></table></div>';
  var ct=k.cost;
  o.costTable = line2([['營造施工費'+(ct.idx!==1?'（指數 '+fmt(ct.idx*100,2)+'%）':''),ct.construction],['規劃設計費',ct.design],['附加成本',ct.extras],['廣告銷售、管理、稅捐',ct.fees],['資本利息',ct.interest],['開發或建築利潤',ct.profit],['建物總成本',ct.T],['累積折舊（'+fmt(ct.age)+' 年）',-ct.dep]].concat(ct.extrasDep?[['附加成本累積折舊',-ct.extrasDep]]:[]).concat([['建物成本價格',ct.building],['土地價格',ct.land],['房地成本價格',ct.price]]))+(ct.depNote?'<div class="box warn">'+ct.depNote+'</div>':'');
  o.costUnit = U(ct.unit,S.unitDec);
  o.costTotal = fmt(ct.price/10000,2)+' 萬元';
  var ld=k.land;
  o.landTable = line2((ld.detailed?[['容積樓地板面積（坪）',fmt(ld.farFloor,2)],['總樓地板面積（坪）',fmt(ld.total,2)],['可銷售面積（坪）',fmt(ld.saleable,2)],['車位（個）',fmt(ld.cars)]]:[]).concat([['總銷售金額 S',ld.S],['直接成本 C',ld.C],['規劃設計費',ld.design],['廣告銷售、管理、稅捐',ld.saleFees],['間接成本 M',ld.M],['利潤率 R',fmt(ld.R*100,2)+'%'],['資本利息綜合利率 i',fmt(ld.i*100,2)+'%'],['土地開發分析價格 V',ld.V]]));
  if (ld.detailed) o.floorTable='<div class="tw"><table class="t" style="min-width:460px"><thead><tr><th>樓層</th><th class="r">銷售面積（坪）</th><th class="r">效用比</th><th class="r">單價（萬元/坪）</th><th class="r">金額（萬元）</th></tr></thead><tbody>'+ld.floors.map(function(x){ return '<tr><td>'+x.f+'F</td><td class="r num">'+fmt(x.area,2)+'</td><td class="r num">'+fmt(x.util,0)+'%</td><td class="r num">'+fmt(x.unit,2)+'</td><td class="r num">'+fmt(x.amt/10000,0)+'</td></tr>'; }).join('')+(ld.cars?'<tr><td>車位</td><td class="r num">'+ld.cars+' 個</td><td></td><td></td><td class="r num">'+fmt(ld.carAmt/10000,0)+'</td></tr>':'')+'<tr class="sum"><td>合計</td><td colspan="3"></td><td class="r num">'+fmt(ld.S/10000,0)+'</td></tr></tbody></table></div>';
  if (ld.ci) o.ciTable='<div class="ck"><span>資金綜合利率</span><span class="num">'+fmt(ld.ci.rate*100,3)+'%</span></div><div class="ck"><span>建築投資（½ 工期）× 權重 '+fmt(ld.ci.wBld*100,1)+'%</span><span class="num">'+fmt(ld.ci.bRate*100,3)+'%</span></div><div class="ck"><span>土地投資（全期）× 權重 '+fmt(ld.ci.wLand*100,1)+'%</span><span class="num">'+fmt(ld.ci.lRate*100,3)+'%</span></div><div class="ck"><b>資本利息綜合利率 i</b><b class="num">'+fmt(ld.i*100,2)+'%</b></div>';
  o.landTotal = fmt(ld.V/10000,0)+' <span style="font-size:14px;color:var(--band-muted)">萬元</span>';
  o.landUnit = ld.unit!==null? '每坪 '+fmt(ld.unit,S.unitDec)+' 萬元（以 '+fmt(area,2)+' 坪換算）':'請在「資料匯入 › 勘估標的」填面積';
  var f=k.fin, units={comparison:cc.unit, income:ic.unit, cost:ct.unit, land:ld.unit};
  Object.keys(units).forEach(function(x){ o['f_'+x] = units[x]!==null? fmt(units[x],S.unitDec)+' <span class="small">萬元/坪</span>':'—'; o['ms_'+x] = units[x]!==null? fmt(units[x],S.unitDec):'—'; });
  o.wsum = f.methods.length>1 ? '<div class="small">權重合計 <b class="num '+(Math.abs(f.wSum-100)<=0.05?'pos':'neg')+'">'+fmt(f.wSum,1)+'%</b></div>' : '';
  o.diffBox = f.methods.length>=2 ? '<div class="box '+(f.diff>=S.diffThreshold?'warn':'ok')+'">各方法價格差距 <b class="num">&nbsp;'+fmt(f.diff,1)+'%&nbsp;</b>'+(f.diff>=S.diffThreshold?'，達顯著差異門檻 '+S.diffThreshold+'%，依 §15 須重新檢討並寫明理由。':'，未達顯著差異門檻。')+'</div>' : '';
  o.fUnit = f.unit!==null? fmt(f.unit,S.unitDec)+' 萬元/坪 × '+fmt(area,2)+' 坪'+(k.isLand&&k.parcels&&k.parcels.rows.length>1?'（逐筆計價後加總）':''):'—';
  o.fTotal = f.totalWan!==null? '新臺幣 '+fmt(f.totalWan,S.totalDec)+' 萬元':'尚無法計算';
  o.fCn = f.yuan!==null? CALC.cnAmount(f.yuan):'';
  if (k.parcels) o.parcelOut='<div class="tw"><table class="t" style="min-width:640px"><thead><tr><th>地號</th><th class="r">面積（坪）</th><th>計價方式</th><th class="r">單價（萬元/坪）</th><th class="r">總價（元）</th><th class="r">增值稅（元）</th></tr></thead><tbody>'+k.parcels.rows.map(function(r){ var p=r.p; return '<tr><td>'+esc((p.section||'')+(p.no||'—'))+'</td><td class="r num">'+fmt(r.ping,2)+'</td><td class="law">'+(p.priceMode==='announced'?'公告現值 '+fmt(p.annPct,0)+'%':p.priceMode==='manual'?'個別評定':'基地單價'+(Number(p.adjPct)?' '+pct(p.adjPct):''))+'</td><td class="r num">'+(r.unit===null?'—':fmt(r.unit,2))+'</td><td class="r num">'+(r.total===null?'—':fmt(Math.round(r.total)))+'</td><td class="r num">'+fmt(r.vat.tax)+'</td></tr>'; }).join('')+'<tr class="sum"><td>合計</td><td class="r num">'+fmt(k.parcels.ping,2)+'</td><td></td><td></td><td class="r num">'+(k.parcels.total===null?'—':fmt(Math.round(k.parcels.total)))+'</td><td class="r num">'+fmt(k.parcels.tax)+'</td></tr></tbody></table></div>'+(k.isLand?'':'<div class="hint">房地案件的土地列只用於標示與增值稅估算；價格以建物面積計。</div>');
  if (k.special){ var sp=k.special; o.specialOut='<div class="ck"><span>比較法（容積 '+fmt(c.special.far,1)+'%）</span><span class="num">'+fmt(sp.comp.unit,S.unitDec)+' 萬/坪</span></div><div class="ck"><span>土地開發分析法</span><span class="num">'+fmt(sp.land.unit,S.unitDec)+' 萬/坪</span></div><div class="ck"><span>完成時價格（加權）</span><span class="num">'+fmt(sp.done,S.unitDec)+' 萬/坪</span></div><div class="ck"><span>折現率'+(c.special.rateMode==='input'?'':'（WACC '+fmt(sp.wacc,2)+'%＋溢酬）')+'／折現比例</span><span class="num">'+fmt(sp.rate,2)+'% ／ '+fmt(sp.df*100,2)+'%</span></div><div class="ck"><b>特定價格</b><b class="num">'+fmt(sp.unit,S.unitDec)+' 萬/坪・'+fmt(sp.totalWan,S.totalDec)+' 萬元</b></div>'; }
  else o.specialOut='<div class="hint">請輸入條件下允建容積率。</div>';
  o.ms_final = f.totalWan!==null? fmt(f.totalWan,S.totalDec)+' 萬':'—';
  o.ms_finalU = f.unit!==null? fmt(f.unit,S.unitDec)+' 萬/坪':'';
  o.fabAmt = f.totalWan!==null? fmt(f.totalWan,S.totalDec)+' 萬元':'尚無法計算';
  return {o:o, c:c, k:k};
}
function refresh(){
  var r=outs(), o=r.o, v=validate(r.c,r.k);
  o.fabSt = r.c.signed?'<span class="chip ok">已交付</span>':v.bl.length?'<span class="chip warn">待處理 '+v.bl.length+'</span>':'<span class="chip ok">可簽名</span>';
  o.msSt = o.fabSt;
  document.querySelectorAll('[data-o]').forEach(function(el){ var key=el.getAttribute('data-o'); if (key in o) el.innerHTML=o[key]; });
  document.querySelectorAll('[data-rp]').forEach(function(rp){ var sc=rp.closest('.right,.sheet')||null, st=sc?sc.scrollTop:0; rp.innerHTML=reportPane(r.c,r.k,v); if (sc) sc.scrollTop=st; });
  var counts={}; v.bl.forEach(function(x){ var t=x.tab.split(':')[0]; counts[t]=(counts[t]||0)+1; });
  document.querySelectorAll('[data-tabdot]').forEach(function(el){ var nn=0; el.getAttribute('data-tabdot').split(',').forEach(function(t){ nn+=counts[t]||0; }); el.hidden=!nn; el.textContent=nn; });
}

/* ===== 繪製 ===== */
var TABS=[['report','估價報告'],['data','資料匯入'],['final','價格決定'],['survey','現勘與訪談'],['params','參數與指標'],['comp','比較法'],['income','收益法'],['cost','成本法'],['land','土地開發分析']];
var TABKEY={comp:'comparison',income:'income',cost:'cost',land:'land'};
var ICONS={
  report:'<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
  data:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  final:'<path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z"/>',
  survey:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'
};
function icon(n){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[n]+'</svg>'; }
function tabName(t){ var x=TABS.find(function(y){ return y[0]===t; }); return x?x[1]:''; }
function methodStrip(c){
  return '<div class="mstrip" aria-label="各方法價格">'+[['comp','comparison','比較價格'],['income','income','收益價格'],['cost','cost','成本價格'],['land','land','土地開發分析']].map(function(m){ var on=c.methods[m[1]];
    return '<button data-act="tab" data-v="'+m[0]+'" class="'+(on?'':'off')+'"><span class="k">'+m[2]+(on?'':'・未採用')+'</span><span class="v" data-o="ms_'+m[1]+'"></span></button>'; }).join('')
   +'<button data-act="tab" data-v="final" class="final"><span class="k">決定總價 <span data-o="msSt"></span></span><span class="v" data-o="ms_final"></span></button></div>';
}
function sheetHtml(c){
  var s=A.ui.sheet; if (!s) return '';
  var title='', body='';
  if (s==='report'){ title='估價報告書'; body='<div data-rp="1"></div>'; }
  else if (s==='newcase'){ title='新案件：選擇標的類型'; body=['土地','建物','商用'].map(function(g){ return '<div class="lbl" style="margin:0">'+g+'</div><div class="g3">'+KINDS.filter(function(x){ return x.group===g; }).map(function(x){ return '<button type="button" class="opt" data-act="newKind" data-v="'+x.id+'"><span><b>'+esc(x.name)+'</b><span class="law">'+esc(x.hint)+'</span></span></button>'; }).join('')+'</div>'; }).join('')+'<div class="hint">類型決定預設的估價方法、比較法因素細項、方法權重與報告書格式；建立後仍可在「資料匯入 › 勘估標的」修改。</div>'; }
  else if (s==='more'){ title='更多'; body='<div class="menu-list">'+[['params','參數與指標（估價模型）',''],['comp','比較法','comparison'],['income','收益法','income'],['cost','成本法','cost'],['land','土地開發分析法','land']].map(function(x){
      return '<button data-act="tab" data-v="'+x[0]+'"><span>'+x[1]+(x[2]&&!c.methods[x[2]]?' <span class="law">未採用</span>':'')+'</span><span class="num small">'+(x[2]?'<span data-o="ms_'+x[2]+'"></span>':esc(MOD(c).name))+'</span></button>'; }).join('')+'</div>'; }
  else if (s==='menu'){ title='案件'; body='<div><label class="lbl" for="casesel2">切換案件</label><select class="inp" id="casesel2">'+A.cases.map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===c.id?' selected':'')+'>'+esc(x.id+'　〔'+kindOf(x.kind).name+'〕'+(x.basic.addr||'新案件'))+(x.signed?'（已交付）':'')+'</option>';}).join('')+'</select></div>'
      +'<div class="g2"><button class="btn ghost" data-act="newCase">新案件</button><button class="btn ghost" data-act="dupCase">複製本案</button><button class="btn ghost" data-act="importCase">匯入案件檔</button></div>'
      +'<div><div class="lbl">身分</div><div class="g2"><button class="btn'+(A.role==='appraiser'?'':' ghost')+'" data-act="role" data-v="appraiser">估價師</button><button class="btn'+(A.role==='assistant'?'':' ghost')+'" data-act="role" data-v="assistant">助理員</button></div></div>'; }
  return '<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="'+title+'"><div class="sheet-grip"></div><div class="sheet-head"><b>'+title+'</b><button class="btn ghost sm" data-act="closeSheet">關閉</button></div><div class="sheet-body">'+body+'</div></div>';
}
function render(){
  var ae=document.activeElement, fid_=ae&&ae.id, selS=null, selE=null; try{ selS=ae.selectionStart; selE=ae.selectionEnd; }catch(e){}
  var c=cur(), k=calc(c), v=validate(c,k), mob=isM();
  var body={report:tabReport,data:tabData,survey:tabSurvey,comp:tabComp,income:tabIncome,cost:tabCost,land:tabLand,final:tabFinal,params:tabParams}[A.tab](c,k,v);
  var side = !mob && A.side && A.tab!=='report';
  var html='<header class="top"><div class="top-in"><div class="brand"><span class="seal-mark">估</span><span>估價報告產生器</span></div>'
   +'<label class="sr" for="casesel">案件</label><select id="casesel">'+A.cases.map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===c.id?' selected':'')+'>'+esc(x.id+'　〔'+kindOf(x.kind).name+'〕'+(x.basic.addr||'新案件'))+(x.signed?'（已交付）':'')+'</option>';}).join('')+'</select>'
   +'<button class="btn ghost sm" data-act="newCase">新案件</button><button class="btn ghost sm" data-act="dupCase">複製本案</button><button class="btn ghost sm" data-act="importCase">匯入案件檔</button><input type="file" id="casefile" accept=".json,application/json" class="sr">'
   +'<div class="roles" role="group" aria-label="身分"><button data-act="role" data-v="appraiser" class="'+(A.role==='appraiser'?'on':'')+'">估價師</button><button data-act="role" data-v="assistant" class="'+(A.role==='assistant'?'on':'')+'">助理員</button></div>'
   +'</div></header>'
   +'<div class="mtop"><span class="seal-mark">估</span><div class="t"><b>'+esc(c.id)+'　'+esc(c.basic.addr||'新案件')+'</b><span>'+tabName(A.tab)+'・'+esc(MOD(c).name)+'</span></div><button data-act="sheet" data-v="menu" aria-label="案件選單">案件</button></div>'
   +'<div class="split"><div class="left">'
   +'<div class="tabs-row"><nav class="tabs" aria-label="分頁">'+TABS.map(function(t){ var off = TABKEY[t[0]] && !c.methods[TABKEY[t[0]]]; return '<button data-act="tab" data-v="'+t[0]+'" class="'+(A.tab===t[0]?'on':'')+'">'+t[1]+(off?' <span class="off">未採用</span>':'')+'<span class="dot" data-tabdot="'+t[0]+'" hidden></span></button>';}).join('')+'</nav>'
   +(A.tab!=='report'?'<button class="btn ghost sm side-toggle" data-act="side" aria-pressed="'+(A.side?'true':'false')+'">'+(A.side?'收起對照報告':'對照報告')+'</button>':'')+'</div>'
   +(c.signed?'<div class="box ok">本案已於 '+esc(c.signedAt)+' 簽名交付，資料與估價模型快照已鎖定；保存至 '+(Number(c.signedAt.slice(0,4))+15)+c.signedAt.slice(4)+' 以後（估價師法 §19 III）。要修改請用「複製本案」。</div>':'')
   +(A.tab!=='report'?methodStrip(c):'')
   + body +'</div>'+(side?'<aside class="right" aria-label="報告書對照"><div data-rp="1"></div></aside>':'')+'</div>'
   +'<nav class="mnav" aria-label="主要分頁">'+[['report','報告','report'],['data','資料','data'],['final','決定','final'],['survey','現勘','survey'],['more','更多','params,comp,income,cost,land']].map(function(x){
      var on = x[0]==='more' ? ['params','comp','income','cost','land'].indexOf(A.tab)>=0 : A.tab===x[0];
      return '<button data-act="'+(x[0]==='more'?'sheet':'tab')+'" data-v="'+x[0]+'" class="'+(on?'on':'')+'"'+(on?' aria-current="page"':'')+'>'+icon(x[0]==='more'?'more':x[0])+'<span>'+x[1]+' <span class="dot" data-tabdot="'+x[2]+'" hidden class="mdot"></span></span></button>'; }).join('')+'</nav>'
   +(A.tab!=='report'?'<button class="fab" data-act="sheet" data-v="report" aria-label="開啟估價報告"><span><span class="lbl2">估價金額・點開看報告</span><br><span class="amt" data-o="fabAmt"></span></span><span data-o="fabSt"></span></button>':'')
   + sheetHtml(c);
  document.getElementById('app').innerHTML=html;
  document.body.style.overflow = A.ui.sheet ? 'hidden' : '';
  refresh(); bindDrop();
  if (fid_){ var el=document.getElementById(fid_); if (el){ el.focus({preventScroll:true}); try{ if(selS!==null) el.setSelectionRange(selS,selE);}catch(e){} } }
}

/* ===== 匯入 ===== */
function readFiles(files){
  var list=Array.from(files||[]).filter(function(f){ return /\.csv$/i.test(f.name); }); if (!list.length){ toast('請選擇 .csv 檔'); return; }
  var done=0, ns=0, nr=0, skipped=0, errs=[], hidNote='';
  list.forEach(function(file){ var fr=new FileReader();
    fr.onload=function(){ var res=importLvr(String(fr.result), file.name, cur().basic.county);
      if (res.error) errs.push(file.name+'：'+res.error);
      else { A.imported.sales=A.imported.sales.concat(res.sales); A.imported.rents=A.imported.rents.concat(res.rents); ns+=res.sales.length; nr+=res.rents.length; skipped+=res.skipped;
        if (!A.hideBuiltin && res.sales.concat(res.rents).some(function(x){ return x.county===LVR_META.county; })){ A.hideBuiltin=true; hidNote='；已停用內建的同縣市資料避免重複'; } }
      if (++done===list.length){ save(); render(); toast(errs.length? errs[0] : '已匯入買賣 '+ns+' 筆、租賃 '+nr+' 筆'+(skipped?'（略過 '+skipped+' 筆非建物或資料不全）':'')+hidNote); } };
    fr.onerror=function(){ errs.push(file.name+' 讀取失敗'); if (++done===list.length){ render(); toast(errs[0]); } };
    fr.readAsText(file,'utf-8'); });
}
function bindDrop(){
  var dz=document.getElementById('drop'), inp=document.getElementById('lvrfile'); if (!dz) return;
  inp.addEventListener('change', function(){ readFiles(inp.files); inp.value=''; });
  ['dragenter','dragover'].forEach(function(ev){ dz.addEventListener(ev,function(e){ e.preventDefault(); dz.classList.add('over'); }); });
  ['dragleave','drop'].forEach(function(ev){ dz.addEventListener(ev,function(e){ e.preventDefault(); dz.classList.remove('over'); }); });
  dz.addEventListener('drop', function(e){ readFiles(e.dataTransfer && e.dataTransfer.files); });
}

/* ===== 事件 ===== */
function today(){ return new Date().toISOString().slice(0,10); }
function clampLaw(S){ S.lim15=Math.min(15,Math.max(0,Number(S.lim15)||0)); S.lim30=Math.min(30,Math.max(0,Number(S.lim30)||0)); S.gapLim=Math.min(20,Math.max(0,Number(S.gapLim)||0)); S.minComps=Math.max(3,Math.round(Number(S.minComps)||3)); }
function onBind(t, commit){
  var p=t.getAttribute('data-b'), val, c=cur();
  if (t.type==='checkbox') val=t.checked;
  else if (t.type==='radio'){ if(!t.checked) return; val=t.value; }
  else if (t.hasAttribute('data-n')){ val=t.value===''?0:parseFloat(t.value); if(isNaN(val)) val=0; }
  else if (t.hasAttribute('data-lines')){ val=t.value.split('\n').map(function(x){ return x.trim(); }).filter(Boolean); }
  else val=t.value;
  if (p==='c.comp.inputMode' && val!==c.comp.inputMode){ var dm=c.comp.method==='diff';
    c.comps.forEach(function(cp){ indAll(MOD(c),c).forEach(function(ind){ var a=cp.adj[ind.id]||(cp.adj[ind.id]={lv:0,pct:0,amt:0}); var stp=dm?Number(ind.stepAmt)||0.5:Number(ind.step)||1;
      if (val==='value'){ if (dm) a.amt=Math.round((Number(a.lv)||0)*stp*100)/100; else a.pct=(Number(a.lv)||0)*stp; }
      else a.lv=Math.max(-3,Math.min(3,Math.round((Number(dm?a.amt:a.pct)||0)/stp))); }); }); }
  if (/^c\.comps\.\d+\.adj\./.test(p)){ var ps=p.split('.'), cp2=c.comps[Number(ps[2])]; if(!cp2.adj[ps[4]]) cp2.adj[ps[4]]={lv:0,pct:0,amt:0}; }
  if (p==='c.final.useModelWeights' && !val){ var M0=MOD(c); c.final.w=JSON.parse(JSON.stringify(modelWeights(c,M0,purposeRule(c,M0)))); }
  setP(p,val);
  if (p==='c.basic.county'){ var dl=districtsOf(val); if (dl.indexOf(c.basic.district)<0) c.basic.district=dl[0]||''; }
  if (p.indexOf('p.')===0) modelById(A.pModel).updated=today();
  if (p.indexOf('m.')===0 && !c.signed) modelById(c.modelId).updated=today();
  if (!t.hasAttribute('data-lines')) document.querySelectorAll('[data-b="'+p+'"]').forEach(function(el){ if (el!==t && el.type!=='checkbox' && el.type!=='radio' && el.tagName!=='SELECT') el.value=val; });
  if (/^p\.settings\.(lim15|lim30|gapLim|minComps)$/.test(p) && commit){ clampLaw(modelById(A.pModel).settings); save(); render(); return; }
  if (p==='c.modelId') toast('本案改用估價模型「'+modelById(val).name+'」');
  save();
  var structural = t.type==='checkbox' || t.type==='radio' || (t.tagName==='SELECT' && (t.hasAttribute('data-rr') || /^[pm]\./.test(p)));
  if (structural || (commit && t.hasAttribute('data-rr'))) render(); else refresh();
}
document.addEventListener('input', function(e){ var t=e.target; if (t.getAttribute && t.getAttribute('data-b') && t.type!=='checkbox' && t.type!=='radio' && t.tagName!=='SELECT') onBind(t,false); });
document.addEventListener('change', function(e){ var t=e.target;
  if (t.id==='casesel' || t.id==='casesel2'){ A.caseId=t.value; A.ui.sheet=null; A.ui.pickConfirm=false; save(); render(); return; }
  if (t.id==='casefile'){ if (t.files && t.files[0]) importCaseFile(t.files[0]); t.value=''; return; }
  if (t.hasAttribute && t.hasAttribute('data-act-set')){ var Pm=modelById(A.pModel), e=Pm.exp[Number(t.getAttribute('data-act-set'))], ss=e.sets||['bldg','land','ind']; ss=ss.filter(function(x){ return x!==t.value; }); if (t.checked) ss.push(t.value); e.sets=ss; Pm.updated=today(); save(); render(); return; }
  if (t.hasAttribute && t.hasAttribute('data-act-var')){ var cs=cur(), v=t.getAttribute('data-act-var'), arr=cs.comp.regVars, i=arr.indexOf(v); if (t.checked && i<0) arr.push(v); if (!t.checked && i>=0) arr.splice(i,1); save(); render(); return; }
  if (t.getAttribute && t.getAttribute('data-b')) onBind(t,true); });
document.addEventListener('toggle', function(e){ var d=e.target; if (!d.getAttribute || !d.hasAttribute('data-card')) return; var i=Number(d.getAttribute('data-card')); if (d.open) A.ui.open=i; else if (A.ui.open===i) A.ui.open=null; }, true);
document.addEventListener('keydown', function(e){ if (e.key==='Escape' && A.ui.sheet){ A.ui.sheet=null; render(); } });
var lastMob=null; window.addEventListener('resize', function(){ clearTimeout(window._rz); window._rz=setTimeout(function(){ var m=isM(); if (m!==lastMob){ lastMob=m; if (!m) A.ui.sheet=null; render(); } },150); });
function nextId(){ var m=0; A.cases.forEach(function(c){ var x=parseInt(String(c.id).split('-')[1],10); if(x>m) m=x; }); return '115-'+String(m+1).padStart(4,'0'); }
function nextLabel(c){ var used=c.comps.map(function(x){return x.label;}); return 'ABCDEFGH'.split('').find(function(l){return used.indexOf(l)<0;}); }
function go(v){ var p=String(v).split(':'); A.tab=p[0]; if (p[1]){ if (p[0]==='data') A.dataSub=p[1]; if (p[0]==='params') A.paramSub=p[1]; } A.ui.sheet=null; }
document.addEventListener('click', function(e){
  var t=e.target.closest('[data-act]'); if(!t || t.disabled || t.tagName==='SELECT' || t.tagName==='INPUT') return;
  if (t.tagName==='A') e.preventDefault();
  var act=t.getAttribute('data-act'), v=t.getAttribute('data-v'), c=cur(), M=MOD(c), P=modelById(A.pModel);
  if (act==='tab' || act==='goTab'){ go(v); if (v==='params') A.pModel=c.modelId; save(); render(); window.scrollTo(0,0); }
  else if (act==='sub'){ A[t.getAttribute('data-k')]=v; A.ui.pickConfirm=false; save(); render(); }
  else if (act==='side'){ A.side=!A.side; save(); render(); }
  else if (act==='sheet'){ A.ui.sheet=v; render(); }
  else if (act==='closeSheet'){ A.ui.sheet=null; render(); }
  else if (act==='role'){ A.role=v; save(); render(); toast(v==='appraiser'?'已切換為估價師':'已切換為助理員：可編輯，不能簽名'); }
  else if (act==='newCase'){ A.ui.sheet='newcase'; render(); }
  else if (act==='newKind'){ var nc=blankCase(nextId(), modelById(c.modelId), c, v); A.cases.unshift(nc); A.caseId=nc.id; A.tab='data'; A.dataSub='subject'; A.ui.sheet=null; save(); render(); toast('已建立'+kindOf(v).name+'案件 '+nc.id+'，模型「'+modelById(nc.modelId).name+'」'); }
  else if (act==='setKind'){ if(L()) return; if (c.kind===v) return; applyKind(c, v); save(); render(); toast('標的類型改為「'+kindOf(v).name+'」，已依模型重設估價方法與權重'); }
  else if (act==='pSet'){ A.pSet=v; render(); }
  else if (act==='kwOn'){ P.kindWeights=P.kindWeights||{}; P.kindWeights[v]=JSON.parse(JSON.stringify((P.purpose['買賣參考']||{w:{comparison:80,income:20,cost:0,land:0}}).w)); P.updated=today(); save(); render(); }
  else if (act==='kwOff'){ P.kindWeights[v]=null; P.updated=today(); save(); render(); }
  else if (act==='resetTexts'){ P.texts=defaultTexts(); P.updated=today(); save(); render(); toast('已恢復範本條文'); }
  else if (act==='docx'){ exportDocx(c); }
  else if (act==='exportCase'){ exportCase(c); }
  else if (act==='importCase'){ var fi=document.getElementById('casefile'); if (fi) fi.click(); }
  else if (act==='dupCase'){ var d=JSON.parse(JSON.stringify(c)); d.id=nextId(); d.signed=false; d.signedAt=''; d.modelSnapshot=null; if (!A.models.some(function(m){ return m.id===d.modelId; })) d.modelId=A.models[0].id; A.cases.unshift(d); A.caseId=d.id; A.ui.sheet=null; save(); render(); toast('已複製為 '+d.id); }
  else if (act==='addLib'){ if(L()) return; var lib=libFind(t.getAttribute('data-id')); if(!lib) return; var lab=nextLabel(c); c.comps.push(newComp(lab, lib)); save(); render(); toast('已加入比較標的 '+lab+(lib.special?'：屬特殊交易，須做情況調整':'')); }
  else if (act==='autoPick'){ if(L()) return;
    if (c.comps.length && !A.ui.pickConfirm){ A.ui.pickConfirm=true; render(); return; }
    var rows=filteredSales(c,M).slice(0, Math.max(1,Math.min(6,Number(M.select.autoN)||3))), N=rows.length; if (!N) return;
    var each=Math.floor(100/N); c.comps=rows.map(function(x,i){ var cp=newComp('ABCDEF'[i], x); cp.weight=each+(i===0?100-each*N:0); return cp; });
    A.ui.pickConfirm=false; save(); render(); toast('已依模型分數挑選 '+N+' 件比較標的，請到「比較法」逐筆調整'); }
  else if (act==='autoPickCancel'){ A.ui.pickConfirm=false; render(); }
  else if (act==='addBlank'){ if(L()) return; c.comps.push(newComp(nextLabel(c))); save(); render(); }
  else if (act==='rmComp'){ if(L()) return; c.comps.splice(Number(t.getAttribute('data-i')),1); A.ui.open=null; save(); render(); }
  else if (act==='dateManual'){ if(L()) return; var i=Number(t.getAttribute('data-i')); c.comps[i].dateAdj=calc(c).comp.rows[i].date; c.comps[i].dateManual=true; save(); render(); }
  else if (act==='dateAuto'){ if(L()) return; c.comps[Number(t.getAttribute('data-i'))].dateManual=false; save(); render(); }
  else if (act==='applyRate'){ if(L()) return; M.settings.monthlyRate=Math.round(Number(v)*100)/100; M.settings.dateMode='auto'; M.updated=today(); save(); render(); toast('模型「'+M.name+'」價格月變動率已設為 '+pct(M.settings.monthlyRate,2)+'／月'); }
  else if (act==='useRent'){ if(L()) return; var rs=rentStats(c,M), R=M.rentSelect; c.income.rent=Number(v);
    c.income.rentSource='依內政部實價登錄租賃實例 '+rs.n+' 筆（'+(R.sameDistrict?c.basic.county+c.basic.district:c.basic.county)+'，價格日期前 '+R.months+' 個月內'+(R.onlyWhole?'、整戶出租':'')+'），每坪月租金中位數 '+fmt(rs.med,0)+' 元 × '+fmt(c.basic.area,2)+' 坪決定';
    save(); render(); toast('收益法月租金已設為 '+fmt(Number(v))+' 元'); }
  else if (act==='applyUnit'){ if(L()) return; var row=M.cost.table[Number(t.getAttribute('data-i'))]; if(!row) return; c.cost.unitCost=Number(row.unit)||0; c.cost.conMethod='unit'; c.cost.unitCostNote='本所估價模型「'+M.name+'」營造單價表「'+row.name+'」'; save(); render(); toast('已套用 '+fmt(row.unit,1)+' 萬元/坪到成本法'); }
  else if (act==='applyModelIncome'){ if(L()) return; c.income.vacMonths=M.income.vacMonths; c.income.cap=M.income.cap; save(); render(); toast(c.income.capMode==='input'?'已改回模型預設':'閒置月數已改回；資本化率預設只用在「直接輸入」'); }
  else if (act==='clearImported'){ A.imported={sales:[],rents:[]}; A.hideBuiltin=false; save(); render(); toast('已清除匯入資料'); }
  else if (act==='listAdd'){ var path=t.getAttribute('data-path'); if (path[0]==='c' && L()) return; var arr=getP(path); if (!Array.isArray(arr)){ setP(path,[]); arr=getP(path); } arr.push(JSON.parse(t.getAttribute('data-tpl')||'{}')); save(); render(); }
  else if (act==='listRm'){ var path2=t.getAttribute('data-path'); if (path2[0]==='c' && L()) return; getP(path2).splice(Number(t.getAttribute('data-i')),1); save(); render(); }
  else if (act==='draftFactors'){ if(L()) return; c.analysis.region=draftRegion(c); c.analysis.indiv=draftIndiv(c); if(!c.analysis.hbu) c.analysis.hbu=draftHbu(c); c.analysis.confirmed=false; save(); render(); toast('已產生草稿，請確認後勾選'); }
  else if (act==='draftReason'){ if(L()) return; var kk=calc(c), f=kk.fin, S=kk.S;
    var parts=f.methods.map(function(m){return m.name+'（每坪 '+fmt(m.unit,S.unitDec)+' 萬元）給予 '+(f.methods.length>1?fmt(m.w,1):'100')+'%';});
    c.final.reason='綜合考量各方法所蒐集資料之可信度、估價目的（'+c.basic.purpose+'）及價格形成因素之相近程度'+(c.final.useModelWeights?'，依本所估價模型「'+kk.M.name+'」對此目的之權重':'')+'，'+parts.join('，')+'，決定勘估標的單價每坪 '+fmt(f.unit,S.unitDec)+' 萬元。'+(f.methods.length>1&&f.diff>=S.diffThreshold?'各方法差異 '+fmt(f.diff,1)+'%，經重新檢討後維持上述權重。':'');
    save(); render(); toast('已產生理由草稿，請依實際判斷修改'); }
  else if (act==='dupModel'){ var cp=JSON.parse(JSON.stringify(P)); cp.id='m'+Date.now().toString(36); cp.name=P.name+'（複本）'; cp.updated=today(); A.models.push(cp); A.pModel=cp.id; save(); render(); toast('已複製為「'+cp.name+'」，可改名後指定給案件'); }
  else if (act==='useModel'){ if(L()) return; c.modelId=P.id; save(); render(); toast('本案改用「'+P.name+'」'); }
  else if (act==='delModel'){ if (A.models.length<2) return; var others=A.models.filter(function(m){ return m.id!==P.id; }), n=0;
    A.cases.forEach(function(x){ if (x.modelId===P.id && !x.signed){ x.modelId=others[0].id; n++; } }); A.models=others; A.pModel=others[0].id; save(); render(); toast('已刪除模型'+(n?'，'+n+' 件案件改用「'+others[0].name+'」':'')); }
  else if (act==='addInd'){ var g=t.getAttribute('data-g'), sk=pSetKey(P); P.indicatorSets[sk].push({id:'x'+Date.now().toString(36), group:g, cat:'', name:g==='region'?'新區域細項':'新個別細項', step:1, stepAmt:0.5, on:true}); P.updated=today(); save(); render(); }
  else if (act==='rmInd'){ P.indicatorSets[pSetKey(P)].splice(Number(t.getAttribute('data-i')),1); P.updated=today(); save(); render(); }
  else if (act==='resetInd'){ var sk2=pSetKey(P); P.indicatorSets[sk2]=defaultIndicatorSet(sk2); if (sk2==='bldg') P.indicators=P.indicatorSets.bldg; P.updated=today(); save(); render(); toast('已恢復這一套的預設細項'); }
  else if (act==='addExp'){ P.exp=P.exp||[]; P.exp.push({id:'e'+Date.now().toString(36), name:'新條件', group:'indiv', pct:0, on:true}); P.updated=today(); save(); render(); }
  else if (act==='rmExp'){ P.exp.splice(Number(t.getAttribute('data-i')),1); P.updated=today(); save(); render(); }
  else if (act==='resetExp'){ P.exp=defaultExp(); P.updated=today(); save(); render(); toast('已恢復預設經驗調整表'); }
  else if (act==='addOwn'){ var b=c.basic; A.own.push({id:'OWN'+Date.now().toString(36), kind:'sale', src:'本所案例', county:b.county, district:b.district||districtsOf(b.county)[0]||'', type:b.btype, zone:b.zone, date:(b.priceDate||today()).slice(0,7), floorNum:0, totalFloors:0, completed:'', age:'', areaPing:0, unitWan:0, park:false, note:'', special:'', presale:false, addr:'', road:'', elevator:false, mgmt:false}); save(); render(); }
  else if (act==='rmOwn'){ A.own.splice(Number(t.getAttribute('data-i')),1); save(); render(); }
  else if (act==='resetAll'){ A=fresh(); A.tab='params'; A.paramSub='check'; save(); render(); toast('已重設為範例資料'); }
  else if (act==='sign'){ var k2=calc(c); if (validate(c,k2).bl.length || A.role!=='appraiser') return; c.modelSnapshot=JSON.parse(JSON.stringify(modelById(c.modelId))); c.signed=true; c.signedAt=today(); save(); render(); toast('已簽名交付，資料與模型快照已鎖定'); }
  else if (act==='copy'){ var el=visibleReport(); if(!el) return;
    var sel=function(){ var r=document.createRange(); r.selectNodeContents(el); var s=window.getSelection(); s.removeAllRanges(); s.addRange(r); toast('已選取全文，請按複製'); };
    try { navigator.clipboard.writeText(el.innerText).then(function(){ toast('已複製報告書全文'); }, sel); } catch(err){ sel(); } }
  else if (act==='download'){ exportHtml(c); }
});
function visibleReport(){ return Array.from(document.querySelectorAll('article.paper')).find(function(el){ return el.offsetParent!==null; }) || document.querySelector('article.paper'); }
function getDL(){ try { if (window.claude && window.claude.use) return window.claude.use('downloads').then(function(d){ return d; }, function(){ return null; }); } catch(e){} return Promise.resolve(null); }
function exportHtml(c){ getDL().then(function(DL){
  var el=visibleReport(); if(!el) return;
  if (!DL){ toast('這個檢視無法下載檔案，請改用「複製全文」'); return; }
  var css='body{font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;color:#17232B;max-width:860px;margin:32px auto;padding:0 24px;line-height:1.85;font-size:14.5px}h1{text-align:center;font-family:"Noto Serif TC",serif}h2{font-family:"Noto Serif TC",serif;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:28px}table{width:100%;border-collapse:collapse;margin:6px 0;font-size:13px}th,td{border:1px solid #bbb;padding:5px 8px;text-align:left;vertical-align:top}th{background:#eef2f1;font-weight:500}td.r{text-align:right}.amount{text-align:center;font-size:22px;font-weight:700}.ph{background:#fbefd9;color:#7a4b00}';
  var doc='<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><title>不動產估價報告書 '+esc(c.id)+'</title><style>'+css+'</style></head><body>'+el.innerHTML+'</body></html>';
  DL.save({filename:'估價報告書_'+c.id+'.html', data:doc}).then(function(){ toast('已下載報告書'); }, function(err){ if (err && err.code==='declined') return; toast('無法下載：'+(err&&err.message||'請改用複製全文')); });
}); }
A = load();
lastMob = isM();
render();
function reportCtx(c,k){
  var M=k.M, st=null; try { st = marketStats(c,M); } catch(e){}
  return {kind:kindOf(c.kind), cn:CALC.cnAmount, inds:indsOf(M,c), exp:expOf(M,c), selText:c.comp.method==='reg'?'':selText(M), marketStats:st, capName:CAPNAMES[c.income.capMode]||''};
}
function reportBlocks(c,k,v){ return REPORT.build(c,k,v,reportCtx(c,k)); }
function applyKind(c, kid){
  var M=MOD(c), kd=kindOf(kid); c.kind=kd.id;
  c.methods.comparison=kd.methods.comparison; c.methods.income=kd.methods.income; c.methods.cost=kd.methods.cost; c.methods.land=kd.methods.land;
  if (kd.id==='industrial' && !c.methods.singleReason) c.methods.singleReason=blankCase('x',M,null,'industrial').methods.singleReason;
  c.final.useModelWeights=true; c.final.w=JSON.parse(JSON.stringify(modelWeights(c,M,purposeRule(c,M))));
  if (isLandKind(kd.id)){ c.comp.volumeBasis=true; c.land.mode='detailed'; if (!c.land.iMode) c.land.iMode='table'; c.basic.btype='土地'; }
  if (kd.id==='hotel'){ c.income.revMode='hotel'; c.income.method='dcf'; if (!Number(c.income.opexPct)) c.income.opexPct=60; }
  if ((isLandKind(kd.id) || kd.id!=='unit') && !(c.parcels||[]).length) c.parcels=[{section:'', no:'', zone:c.basic.zone||'', areaM2:0, share:1, annVal:0, prevVal:0, prevDate:'', cpi:100, priceMode:'base', adjPct:0, annPct:30, unit:0, note:''}];
  c.comps.forEach(function(cp){ cp.adj=cp.adj||{}; });
}
function loadDocx(){
  if (window.docx) return Promise.resolve(window.docx);
  if (loadDocx._p) return loadDocx._p;
  loadDocx._p = new Promise(function(res, rej){ var s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/docx@9.5.1/dist/index.iife.js'; s.onload=function(){ window.docx ? res(window.docx) : rej(new Error('docx 載入失敗')); }; s.onerror=function(){ loadDocx._p=null; rej(new Error('無法載入 Word 產生元件，請檢查網路')); }; document.head.appendChild(s); });
  return loadDocx._p;
}
function exportDocx(c){
  var k=calc(c), v=validate(c,k);
  toast('正在產生 Word 檔…');
  Promise.all([getDL(), loadDocx()]).then(function(r){ var DL=r[0], Dx=r[1];
    if (!DL){ toast('這個檢視無法下載檔案'); return; }
    var doc=REPORT.toDocx(reportBlocks(c,k,v), Dx, {office:c.appraiser.office, caseNo:(c.report&&c.report.caseNo)||c.id});
    return Dx.Packer.toBlob(doc).then(function(blob){ return DL.save({filename:'估價報告書_'+c.id+(c.signed?'':'_草稿')+'.docx', data:blob}); }).then(function(){ toast('已下載 Word 報告書'); });
  }).catch(function(err){ if (err && err.code==='declined') return; toast((err&&err.message)||'無法產生 Word 檔'); });
}
function exportCase(c){ getDL().then(function(DL){ if (!DL){ toast('這個檢視無法下載檔案'); return; }
  DL.save({filename:'案件_'+c.id+'.json', data:JSON.stringify({format:'appraisal-case', v:5, case:c, model:MOD(c)}, null, 2)}).then(function(){ toast('已下載案件檔，可交給 Claude（MCP）或其他電腦匯入'); }, function(err){ if (err && err.code==='declined') return; toast('無法下載'); }); }); }
function importCaseFile(file){
  var fr=new FileReader(); fr.onload=function(){ try {
    var o=JSON.parse(String(fr.result)), c=o.case||o; if (!c || !c.basic || !c.id) throw new Error('不是案件檔');
    if (o.model && o.model.id && !A.models.some(function(m){ return m.id===o.model.id; })) A.models.push(o.model);
    if (!A.models.some(function(m){ return m.id===c.modelId; })) c.modelId=A.models[0].id;
    var base=blankCase(c.id, modelById(c.modelId), null, c.kind||'unit'); c=deepMerge(base, c);
    if (A.cases.some(function(x){ return x.id===c.id; })) c.id=nextId();
    A.cases.unshift(c); A.caseId=c.id; A.tab='report'; A.ui.sheet=null; save(); render(); toast('已匯入案件 '+c.id);
  } catch(e){ toast('匯入失敗：'+e.message); } }; fr.readAsText(file,'utf-8');
}
function deepMerge(a, b){ if (Array.isArray(b) || b===null || typeof b!=='object') return b; var o=Object.assign({}, a); Object.keys(b).forEach(function(key){ o[key] = (a && typeof a[key]==='object' && !Array.isArray(a[key]) && a[key]!==null) ? deepMerge(a[key], b[key]) : b[key]; }); return o; }
