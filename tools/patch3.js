function reportCtx(c,k){
  var M=k.M, st=null; try { st = marketStats(c,M); } catch(e){}
  return {kind:kindOf(c.kind), cn:CALC.cnAmount, inds:indsOf(M,c), exp:expOf(M,c), selText:c.comp.method==='reg'?'':selText(M), marketStats:st, capName:CAPNAMES[c.income.capMode]||''};
}
function reportBlocks(c,k,v){ return REPORT.build(c,k,v,reportCtx(c,k)); }
function reportHtml(c,k,v){
  return (c.signed?'':'<p class="small" style="text-align:center;color:var(--warn);margin:0 0 8px">草稿（黃底為待填欄位）</p>') + REPORT.toHTML(reportBlocks(c,k,v));
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
function sheetHtml(c){
  var s=A.ui.sheet; if (!s) return '';
  var title='', body='';
  if (s==='report'){ title='估價報告書'; body='<div data-rp="1"></div>'; }
  else if (s==='newcase'){ title='新案件：選擇標的類型'; body=['土地','建物','商用'].map(function(g){ return '<div class="lbl" style="margin:0">'+g+'</div><div class="g3">'+KINDS.filter(function(x){ return x.group===g; }).map(function(x){ return '<button type="button" class="opt" data-act="newKind" data-v="'+x.id+'"><span><b>'+esc(x.name)+'</b><span class="law">'+esc(x.hint)+'</span></span></button>'; }).join('')+'</div>'; }).join('')+'<div class="hint">類型決定預設的估價方法、比較法因素細項、方法權重與報告書格式；建立後仍可在「資料匯入 › 勘估標的」修改。</div>'; }
  else if (s==='more'){ title='更多'; body='<div class="menu-list">'+[['params','參數與指標（估價模型）',''],['comp','比較法','comparison'],['income','收益法','income'],['cost','成本法','cost'],['land','土地開發分析法','land']].map(function(x){
      return '<button data-act="tab" data-v="'+x[0]+'"><span>'+x[1]+(x[2]&&!c.methods[x[2]]?' <span class="law">未採用</span>':'')+'</span><span class="num small">'+(x[2]?'<span data-o="ms_'+x[2]+'"></span>':esc(MOD(c).name))+'</span></button>'; }).join('')+'</div>'; }
  else if (s==='menu'){ title='案件'; body='<div><label class="lbl" for="casesel2">切換案件</label><select class="inp" id="casesel2">'+A.cases.map(function(x){return '<option value="'+esc(x.id)+'"'+(x.id===c.id?' selected':'')+'>'+esc(x.id+'　'+(x.basic.addr||'新案件'))+(x.signed?'（已交付）':'')+'</option>';}).join('')+'</select></div>'
      +'<div class="g2"><button class="btn ghost" data-act="newCase">新案件</button><button class="btn ghost" data-act="dupCase">複製本案</button><button class="btn ghost" data-act="importCase">匯入案件檔</button></div>'
      +'<div><div class="lbl">身分</div><div class="g2"><button class="btn'+(A.role==='appraiser'?'':' ghost')+'" data-act="role" data-v="appraiser">估價師</button><button class="btn'+(A.role==='assistant'?'':' ghost')+'" data-act="role" data-v="assistant">助理員</button></div></div>'; }
  return '<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="'+title+'"><div class="sheet-grip"></div><div class="sheet-head"><b>'+title+'</b><button class="btn ghost sm" data-act="closeSheet">關閉</button></div><div class="sheet-body">'+body+'</div></div>';
}
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
