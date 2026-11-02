
/* ===== 報告書結構（依全聯會第二號公報「敘述式估價報告書範本」章節） =====
   reportBlocks() 產生與輸出格式無關的區塊，網頁與 Word 共用。
   文字中以 ⟦…⟧ 標示待填欄位。 */
if (typeof module !== 'undefined' && module.exports){ /* Node：載入摘要式需要的題目定義；網頁版已串接在同一個 script，不需要 */
  var _SV = require('./survey.js'), SURVEY = _SV.SURVEY, AREA_ROWS = _SV.AREA_ROWS, LIEN_COLS = _SV.LIEN_COLS, chkShown = _SV.chkShown, surveyDisclosures = _SV.surveyDisclosures;
}
var REPORT = (function(){
  function n(x){ var v=Number(x); return isFinite(v)?v:0; }
  function f(v,d){ if (v===null||v===undefined||v===''||isNaN(v)) return '—'; return Number(v).toLocaleString('zh-TW',{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); }
  function pc(v,d){ if (v===null||v===undefined||isNaN(v)) return '—'; v=Number(v); return (v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d===undefined?1:d)+'%'; }
  function sg(v,d){ v=Number(v)||0; return (v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d===undefined?2:d); }
  function V(x,p){ return x ? String(x) : '⟦'+(p||'待填')+'⟧'; }
  function roc(d){ if (!d) return '⟦日期⟧'; var p=String(d).split('-'); if (p.length<2) return d; return '民國 '+(Number(p[0])-1911)+' 年 '+p[1]+' 月'+(p[2]?' '+p[2]+' 日':''); }
  function unitTxt(v, S){ if (v===null||v===undefined) return '—'; return S.unitDisplay==='yuan' ? f(Math.round(v*10000),0)+' 元/坪' : f(v, S.unitDec)+' 萬元/坪'; }
  function amtTxt(totalWan, yuan, S){ if (totalWan===null||totalWan===undefined) return '⟦尚未決定⟧'; return yuan!==null&&yuan!==undefined&&S.unitDisplay==='yuan' ? '新臺幣 '+f(yuan,0)+' 元' : '新臺幣 '+f(totalWan,S.totalDec)+' 萬元'; }
  var SECT=['一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五'];
  var MNAME={comparison:'比較法', income:'收益法', cost:'成本法', land:'土地開發分析法'};
  var MDEF={comparison:'比較法係以比較標的價格為基礎，經比較、分析及調整等，以推算勘估標的價格之方法（§18）。',
    income:'收益法係以勘估標的未來平均一年期間之客觀淨收益，應用價格日期當時適當之收益資本化率推算勘估標的價格之方法；得採直接資本化法及折現現金流量分析法（§28）。',
    cost:'成本法係求取勘估標的於價格日期之重建成本或重置成本，扣減其累積折舊額或其他應扣除部分，以推算勘估標的價格之方法（§48）。',
    land:'土地開發分析法係根據土地法定用途及使用強度進行開發與改良所導致土地效益之變化，估算開發或建築後總銷售金額，扣除開發期間之直接成本、間接成本、資本利息及利潤後，求得開發前或建築前土地價格之方法（§70）。'};

  function build(c, k, v, ctx){
    ctx = ctx || {};
    var b=c.basic, a=c.appraiser, S=k.S, M=k.M, fin=k.fin, kd=ctx.kind || {name:'', id:c.kind}, out=[], tx=M.texts||{}, R=c.report||{};
    var land = k.isLand, hasParcels = k.parcels && k.parcels.rows.length;
    var amt = amtTxt(fin.totalWan, fin.yuan, S), amtCn = fin.yuan ? ctx.cn(fin.yuan) : '';
    var spAmt = k.special ? amtTxt(k.special.totalWan, k.special.parcels && k.special.parcels.total ? Math.round(k.special.parcels.total) : null, S) : null;
    var caseNo = R.caseNo || c.id, title = b.addr || '⟦勘估標的⟧';
    var P = function(t){ out.push({t:'p', text:t}); }, H1=function(t){ out.push({t:'h1', text:t}); }, H2=function(t){ out.push({t:'h2', text:t}); }, H3=function(t){ out.push({t:'h3', text:t}); };
    var KV=function(rows){ out.push({t:'kv', rows:rows}); }, T=function(head, rows, o){ out.push(Object.assign({t:'table', head:head, rows:rows}, o||{})); }, L=function(items, ord){ out.push({t:'list', items:items, ordered:ord!==false}); };
    var PB=function(){ out.push({t:'pb'}); };
    var methodsUsed=['comparison','income','cost','land'].filter(function(m){ return c.methods[m]; });

    /* 封面 */
    out.push({t:'cover', office:a.office, title:'不動產估價報告書', rows:[['案號',caseNo],['委託人',V(b.client,'委託人')],['勘估標的',title],['估價金額', (k.special? '正常價格 '+amt+'；'+(c.special.label||'特定')+'特定價格 '+spAmt : amt)],['價格日期',roc(b.priceDate)]]});
    PB();
    /* 函 */
    out.push({t:'letter', to:V(b.client,'委託人'), body:[
      '關於 貴公司委託本所針對座落於'+title+'之勘估標的進行價值評估乙案，本所業已完成估價報告書。依 貴公司委託內容，估價目的為'+V(b.purpose)+'，價格種類為'+b.priceType+(k.special?'及特定價格':'')+'，價格日期為'+roc(b.priceDate)+'，並考量 貴公司提供之勘估標的基本資料，評估勘估標的於現行不動產市場條件下之合理價值。評估過程均詳載於估價報告書，且依循不動產估價師法及不動產估價技術規則相關規定。',
      '經本所估價師採用'+methodsUsed.map(function(m){ return MNAME[m]; }).join('、')+'進行評估，決定勘估標的於'+roc(b.priceDate)+'之價值為：'+amt+(amtCn?'（'+amtCn+'）':'')+'。'+(k.special?' '+(c.special.label||'特定條件')+'之特定價格為'+spAmt+'。':''),
      '以上評估結果僅適用於勘估標的於前述估價目的下之價值參考。由於不動產價值變動之特性，本估價報告書所載內容之有效期間最長為價格日期起 '+(tx.validMonths||6)+' 個月內。'],
      office:a.office, signer:a.name, certs:[['開業證書字號',V(a.licenseNo)],['公會會員證書字號',V(a.guildNo)],['不動產估價師證書字號',V(a.certNo)]]});
    PB();
    /* 目錄 */
    H1('目錄');
    L(['不動產估價報告書摘要','壹、序言','貳、估價基本事項','參、價格形成之主要因素分析','肆、價格評估','伍、價格結論','陸、依不動產估價技術規則須敘明之情況及其他與估價相關之必要事項','柒、不動產估價師','附件'], false);
    PB();
    /* 摘要 */
    H1('不動產估價報告書摘要');
    KV([['一、案號',caseNo],['二、委託人',V(b.client)],['三、勘估標的',title],
      ['　土地標示', hasParcels ? k.parcels.rows.map(function(r){ return (r.p.section||'')+(r.p.no?r.p.no+' 地號':''); }).join('、') : V(b.landNo,'地號')],
      ['　建物標示', land ? '—' : V(b.bldgNo,'建號')],
      ['　面積', hasParcels ? '土地 '+f(k.parcels.m2,2)+' 平方公尺（'+f(k.parcels.ping,4)+' 坪）'+(land?'':'；建物 '+f(n(b.area)*3.30579,2)+' 平方公尺（'+f(b.area,2)+' 坪）') : '建物 '+f(b.area,2)+' 坪'],
      ['　所有權人',V(b.owner)],['　使用分區',V(b.zone)],['　使用現況',V(c.survey.useStatus)],['　標的類型',kd.name],
      ['四、估價目的',V(b.purpose)],['　價格種類',b.priceType+(k.special?'、特定價格':'')],['　估價條件',V(b.conditions)],['　價格日期',roc(b.priceDate)],['　勘察日期',roc(b.surveyDate)],
      ['五、他項權利',V(b.encumbrance)],
      ['六、評估價值結論', amt+(amtCn?'（'+amtCn+'）':'')+(k.special?'；特定價格 '+spAmt:'')]]);
    if (hasParcels && k.parcels.tax>0) P('按公告土地現值核算之土地增值稅約新臺幣 '+f(k.parcels.tax,0)+' 元；扣除後淨值約新臺幣 '+(fin.yuan?f(fin.yuan-k.parcels.tax,0):'—')+' 元（不考慮減免規定，實際以稅捐機關核定為準）。');
    if (hasParcels && land) parcelTable(k.parcels, '價格摘要表');
    PB();
    /* 壹 序言 */
    H1('壹、序言');
    H2('一、估價立場聲明'); L(tx.stance||[]);
    H2('二、估價報告書基本聲明事項'); L(tx.assumptions||[]);
    H2('三、估價報告書使用之限制條件'); L(tx.limits||[]);
    /* 貳 基本事項 */
    H1('貳、估價基本事項');
    H2('一、委託人'); P(V(b.client));
    H2('二、勘估標的之基本資料');
    H3('（一）勘估標的內容');
    if (hasParcels) T(['地段','地號','使用分區','面積(㎡)','權利範圍','面積(坪)'], k.parcels.rows.map(function(r){ return [r.p.section||'', r.p.no||'⟦地號⟧', r.p.zone||'', f(r.p.areaM2,2), r.p.share===undefined||r.p.share===''||n(r.p.share)===1?'全部':String(r.p.share), f(r.ping,4)]; }).concat([['合計','','',f(k.parcels.m2,2),'',f(k.parcels.ping,4)]]), {align:['l','l','l','r','l','r']});
    if (!land) KV([['門牌',V(b.addr)],['建號',V(b.bldgNo)],['建物面積',f(b.area,2)+' 坪（'+f(n(b.area)*3.30579,2)+' 平方公尺）'],['樓層', n(b.floorNum)?'第 '+b.floorNum+' 層／共 '+(b.totalFloors||'—')+' 層':'共 '+(b.totalFloors||'—')+' 層'],['構造',V(b.floorDesc)],['建築完成日',V(b.completed)],['建物型態',b.btype]]);
    P('評估之權利種類：所有權。');
    H3('（二）產權分析'); KV([['所有權人及權利範圍',V(b.owner)],['他項權利',V(b.encumbrance)],['限制登記','依登記謄本，'+(R.restrict||'查無預告登記、查封等限制登記情事')+'。']]);
    H2('三、價格日期及勘察日期'); KV([['價格日期',roc(b.priceDate)],['勘察日期',roc(b.surveyDate)]]);
    H2('四、價格種類及估價條件'); KV([['價格種類',b.priceType+(k.special?'及特定價格':'')],['估價條件',V(b.conditions)]]);
    H2('五、估價目的'); P('本次估價結果作為勘估標的'+V(b.purpose)+'之參考，報告書所載價格僅限於該目的之參考，不適用於其他用途。');
    H2('六、利益衝突之聲明'); P('本事務所及本所估價師與委託人、不動產所有權人或交易雙方僅為單純之業務關係，並無國際會計準則第 24 號所定之關係人或實質關係人之情事。');
    H2('七、現況勘察情況說明');
    KV([['勘察日期',roc(b.surveyDate)],['領勘人及其說明', c.survey.led ? (R.leader||'委託人指派人員領勘')+'。' : '委託人未領勘，由本所人員自行前往勘察，位置依地籍圖、都市計畫圖及現場比對，正確界址以地政機關鑑界為準。'],
      ['現場勘察參考資料',R.surveyRefs||'登記謄本、地籍圖'],['勘察結論',V(c.survey.useStatus)+(c.survey.photos?'（拍攝現況照片 '+c.survey.photos+' 張）':'')]]);
    H2('八、估價資料來源說明');
    L([ '不動產權利狀態以地政事務所核發之登記謄本為準。','都市計畫及土地使用分區以都市計畫機關查詢或土地使用分區證明為準。','不動產個別條件及區域環境係估價人員親赴現場勘察，並依都市計畫及地籍資料查證紀錄。','價格資料取自內政部不動產交易實價查詢服務網、本所案例資料庫，並向仲介、地政士、估價同業訪查。'].concat(R.dataSources?[R.dataSources]:[]));
    H2('九、其他負擔'); P(R.otherBurden||'無。');
    /* 參 因素分析 */
    H1('參、價格形成之主要因素分析');
    H2('一、一般因素分析'); P(V(c.analysis.general,'一般因素'));
    H2('二、不動產市場概況分析'); P(V(R.market,'市場供需、價格水準、交易概況'));
    if (ctx.marketStats && ctx.marketStats.n) P('依本所蒐集之實價登錄資料，同一供需圈近期類似不動產成交 '+ctx.marketStats.n+' 筆，單價中位數約 '+unitTxt(ctx.marketStats.med,S)+'，第 25～75 百分位約 '+unitTxt(ctx.marketStats.p25,S)+'～'+unitTxt(ctx.marketStats.p75,S)+'。');
    H2('三、區域因素分析'); P(V(c.analysis.region,'區域因素'));
    H2('四、個別因素分析'); P(V(c.analysis.indiv,'個別因素'));
    H2('五、法定使用管制與其他管制事項'); P('勘估標的土地使用分區為'+V(b.zone)+(R.zoneRule?'；'+R.zoneRule:'')+'。');
    H2('六、最有效使用分析'); P(V(c.analysis.hbu,'最有效使用'));
    if (hasParcels){ H2('七、土地增值稅預估');
      T(['地號','公告現值(元/㎡)','前次移轉現值(元/㎡)','物價指數','增值稅(元)'], k.parcels.rows.map(function(r){ return [(r.p.section||'')+(r.p.no||''), f(r.p.annVal,0), f(r.p.prevVal,1), f(r.p.cpi,1)+'%', f(r.vat.tax,0)]; }).concat([['合計','','','',f(k.parcels.tax,0)]]), {align:['l','r','r','r','r']});
      P('依土地稅法第 33 條一般稅率（20%、30%、40%）計算，未考慮長期持有減徵、自用住宅用地等優惠，實際以稅捐機關核定為準。'); }
    /* 肆 價格評估 */
    H1('肆、價格評估');
    H2('一、價格種類'); P(b.priceType==='正常價格' ? '正常價格指具有市場性之不動產，於有意願之買賣雙方，依專業知識、謹慎行動，不受任何脅迫，經適當市場行銷及正常交易條件形成之合理價值，並以貨幣金額表示者（§2(1)）。'+(k.special?'特定價格指具有市場性之不動產，基於特定條件下形成之價值（§2(3)）。':'') : '本案價格種類為'+b.priceType+'。');
    H2('二、估價方法之選定');
    P('本案依勘估標的之類型（'+kd.name+'）、估價目的及資料可取得程度，採用'+methodsUsed.map(function(m){ return MNAME[m]; }).join('、')+'評估（§14）。'+(R.methodReason||''));
    methodsUsed.forEach(function(m){ P(MDEF[m]); });
    var notUsed=['comparison','income','cost','land'].filter(function(m){ return !c.methods[m]; });
    if (methodsUsed.length===1) P('僅採一種方法之理由：'+V(c.methods.singleReason,'理由'));
    else if (notUsed.length && R.notUsedReason) P('未採'+notUsed.map(function(m){ return MNAME[m]; }).join('、')+'之理由：'+R.notUsedReason);
    H2('三、價格評估過程');
    var si=0;
    if (c.methods.comparison) compSection(SECT[si++]);
    if (c.methods.income) incomeSection(SECT[si++]);
    if (c.methods.cost) costSection(SECT[si++]);
    if (c.methods.land) landSection(SECT[si++]);
    H2('四、價格決定');
    if (fin.methods.length) T(['估價方法','試算單價','權重','加權後'], fin.methods.map(function(m){ return [m.name, unitTxt(m.unit,S), fin.methods.length>1?f(m.w,0)+'%':'100%', fin.methods.length>1?unitTxt(m.unit*m.w/100,S):unitTxt(m.unit,S)]; }).concat([['決定單價','','',unitTxt(fin.unit,S)]]), {align:['l','r','r','r']});
    P(V(c.final.reason,'價格決定理由'));
    if (fin.methods.length>=2) P('各方法試算價格差異為 '+f(fin.diff,1)+'%'+(fin.diff>=S.diffThreshold?'，已就顯著差異重新檢討（§15）。':'，未達顯著差異。'));
    if (k.special) specialSection();
    /* 伍 結論 */
    H1('伍、價格結論');
    P('勘估標的係坐落於'+title+'之不動產，基於估價目的為'+V(b.purpose)+'，價格種類為'+b.priceType+'，價格日期為'+roc(b.priceDate)+'，經本所估價師針對產權、一般因素、區域因素、個別因素、不動產市場現況及最有效使用分析後，決定勘估標的價格如下：');
    if (hasParcels && land) parcelTable(k.parcels, '勘估標的價格明細表（正常價格）');
    else T(['項目','單價','面積(坪)','總價'], [['勘估標的', unitTxt(fin.unit,S), f(k.area||b.area,2), amt]], {align:['l','r','r','r']});
    if (k.special) parcelTable(k.special.parcels, '勘估標的價格明細表（'+(c.special.label||'特定')+'特定價格）');
    out.push({t:'amount', text:amt+(amtCn?'（'+amtCn+'）':'')});
    /* 陸 須敘明 */
    H1('陸、依不動產估價技術規則須敘明之情況及其他與估價相關之必要事項');
    H2('一、依不動產估價技術規則須敘明之情況'); if (v.notes.length) L(v.notes.map(function(x){ return x.t+'（'+x.law+'）'; })); else P('無。');
    H2('二、其他與估價相關之必要事項'); var oth=(c.other||'').split('\n').filter(Boolean); if (oth.length) L(oth); else P('無。');
    /* 柒 估價師 */
    H1('柒、不動產估價師');
    KV([['事務所',a.office||''],['不動產估價師',V(a.name)+(c.signed?'（已簽章，'+c.signedAt+'）':'（簽章）')],['不動產估價師證書字號',V(a.certNo)],['開業證書字號',V(a.licenseNo)+(a.licenseExp?'（有效期限 '+a.licenseExp+'）':'')],['公會會員證書字號',V(a.guildNo)],['所屬公會',a.guild||'']]);
    H1('附件');
    L(['勘估標的位置圖','勘估標的都市計畫（使用分區）略圖','土地及建物登記謄本','地籍圖謄本'].concat(land?['土地使用分區證明']:['建物測量成果圖']).concat(['比較標的位置圖及實價登錄資料','勘估標的現況照片','營造或施工費標準表、物價指數及利率參考資料','不動產估價師證照影本']), true);
    return out;

    function parcelTable(pc, cap){
      H3(cap);
      T(['地段','地號','使用分區','面積(坪)','單價','總價(元)','計價方式'], pc.rows.map(function(r){ var p=r.p; return [p.section||'', p.no||'', p.zone||'', f(r.ping,4), unitTxt(r.unit,S), r.total===null?'—':f(Math.round(r.total),0), p.priceMode==='announced'?'公告現值 '+f(p.annPct,0)+'%':p.priceMode==='manual'?'個別評定':(n(p.adjPct)?'基地單價 '+pc_(p.adjPct):'基地單價')]; })
        .concat([['合計','','',f(pc.ping,4),'',pc.total===null?'—':f(Math.round(pc.total),0),'']]), {align:['l','l','l','r','r','r','l']});
    }
    function pc_(x){ return pc(x,1); }
    function compSection(no){
      var cc=k.comp, cm=c.comp.method, isD=cm==='diff', act=ctx.inds||[], ex=ctx.exp||[];
      H3('（'+no+'）比較法');
      if (ctx.selText) P(ctx.selText);
      if (cm==='reg'){ var Rg=k.reg; if (!Rg||Rg.err){ P('⟦計量模型尚無法估計⟧'); return; }
        P('以符合條件之成交案例 '+Rg.n+' 筆為樣本，依變數為成交單價，採迴歸分析（§19(7)）。調整後判定係數 '+f(Rg.adjR2,3)+'，整體顯著機率 '+(Rg.p<0.0001?'小於 0.0001':f(Rg.p,4))+'（§20）。推估比較價格為 '+unitTxt(cc.unit,S)+'。');
        T(['變數','係數','標準誤'], [['常數',f(Rg.beta[0],3),f(Rg.se[0],3)]].concat(Rg.vars.map(function(vv,i){ return [vv,f(Rg.beta[i+1],3),f(Rg.se[i+1],3)]; })), {align:['l','r','r']}); return; }
      if (!c.comps.length){ P('⟦尚未選擇比較標的⟧'); return; }
      P('區域因素及個別因素調整以'+(isD?'差額法':'百分率法')+'為之（§24），依優劣程度評定差異'+(c.comp.inputMode==='grade'?'（劣、較劣、稍劣、相當、稍優、較優、優）':'')+'；總調整率以「(1＋情況)×(1＋價格日期)×(1＋區域)×(1＋個別)」連乘計算。'+(k.isLand&&c.comp.volumeBasis?'土地比較標的先換算為每 100% 容積地價，再乘以勘估標的允建容積率 '+f(c.comp.subjFar,1)+'%。':''));
      var lbl=c.comps.map(function(cp){ return '比較標的 '+cp.label; });
      H3('比較標的條件分析表');
      var cond=[['位置', c.comps.map(function(cp){ return cp.loc||''; })],['價格日期', c.comps.map(function(cp){ return cp.date||''; })],['價格型態', c.comps.map(function(cp){ return cp.priceType==='ask'?'擬售價格':'成交價格'; })],
        ['資料來源', c.comps.map(function(cp){ return cp.dataSrc||cp.src||'估價師蒐集'; })]];
      if (k.isLand) cond.push(['使用分區', c.comps.map(function(cp){ return cp.zone||''; })],['容積率', c.comps.map(function(cp){ return cp.far?f(cp.far,1)+'%':'—'; })],['面積(坪)', c.comps.map(function(cp){ return f(cp.area,2); })]);
      else cond.push(['樓層', c.comps.map(function(cp){ return cp.floor||''; })],['屋齡(年)', c.comps.map(function(cp){ return String(cp.age===''?'—':cp.age); })],['面積(坪)', c.comps.map(function(cp){ return f(cp.area,2); })]);
      cond.push(['單價', c.comps.map(function(cp){ return unitTxt(cp.price,S); })]);
      T(['項目','勘估標的'].concat(lbl), cond.map(function(r){ return [r[0], r[0]==='容積率'?f(c.comp.subjFar,1)+'%':r[0]==='面積(坪)'?f(k.area||b.area,2):r[0]==='使用分區'?(b.zone||''):r[0]==='價格日期'?(b.priceDate||''):'—'].concat(r[1]); }), {align:['l','l'].concat(c.comps.map(function(){ return 'r'; }))});
      H3('比較價格調整試算表');
      var cell=function(i,id){ var it=cc.rows[i].items.find(function(x){ return x.id===id; }); return isD?sg(it?it.v:0):pc(it?it.pct:0); };
      var rows=[];
      var line=function(lab, fn){ rows.push([lab].concat(c.comps.map(fn))); };
      line('單價', function(cp,i){ return unitTxt(cp.price,S); });
      if (c.comps.some(function(cp){ return cp.priceType==='ask'; })) line('議價空間', function(cp,i){ return cp.priceType==='ask'?'−'+f(cp.bargain,1)+'%':'—'; });
      if (k.isLand && c.comp.volumeBasis) line('容積地價（每 100% 容積）', function(cp,i){ return cc.rows[i].volPrice===null?'—':unitTxt(cc.rows[i].volPrice,S); });
      line('情況調整(A)', function(cp,i){ return pc(cc.rows[i].cond); });
      line('價格日期調整(B)', function(cp,i){ return pc(cc.rows[i].date); });
      var cats=function(g){ var arr=act.filter(function(x){ return x.group===g; }), seen={};
        arr.forEach(function(ind){ line((ind.cat?ind.cat+'：':'')+ind.name, function(cp,i){ return cell(i,ind.id); }); });
        ex.filter(function(e){ return e.group===g && ((c.subjFlags&&c.subjFlags[e.id]) || c.comps.some(function(cp){ return cp.flags&&cp.flags[e.id]; })); }).forEach(function(e){ line('經驗：'+e.name, function(cp,i){ return cell(i,'x:'+e.id); }); }); };
      cats('region'); line('區域因素調整(C)', function(cp,i){ return isD?sg(cc.rows[i].rv):pc(cc.rows[i].r); });
      cats('indiv'); line('個別因素調整(D)', function(cp,i){ return isD?sg(cc.rows[i].iv):pc(cc.rows[i].i); });
      line('總調整率', function(cp,i){ return f(cc.rows[i].factor*100,2)+'%'; });
      line('差異百分率絕對值加總', function(cp,i){ return f(cc.rows[i].absSum,1); });
      line('試算價格', function(cp,i){ return unitTxt(cc.rows[i].trial,S); });
      line('權重', function(cp,i){ return cc.rows[i].usable?f(cc.rows[i].weight,0)+'%':'不採用'; });
      T(['項目'].concat(lbl), rows, {align:['l'].concat(c.comps.map(function(){ return 'r'; })), small:true});
      P('採用比較標的 '+cc.usedCount+' 件（§27），試算價格差距 '+f(cc.gap,2)+'%（§26）。比較標的權重'+(S.weightMode==='deviation'?'依各比較標的差異百分率絕對值加總與其平均值之偏離率計算':S.weightMode==='inverse'?'依總調整率反比分配':'依資料可信度、總調整率及差異程度決定')+'，求得比較價格為 '+unitTxt(cc.unit,S)+'。');
    }
    function incomeSection(no){
      var ic=k.inc, I=c.income;
      H3('（'+no+'）收益法（'+(I.method==='dcf'?'折現現金流量分析法':'直接資本化法')+'）');
      if (ic.hotel) P('勘估標的為營業中旅館，以客房收入推估總收入：客房數 '+f(I.rooms)+' 間 × 平均房價 '+f(I.adr)+' 元 × 365 日 × 住房率 '+f(I.occ,1)+'% ＝ '+f(ic.roomRev)+' 元；其他收入以客房收入 '+f(I.otherPct,1)+'% 計。'+(I.rentSource?I.rentSource+'。':''));
      else P('月租金 '+f(I.rent)+' 元，'+V(I.rentSource,'租金來源')+'（§36、§37）。');
      var rows=[['總收入',f(ic.gross)]];
      if (!ic.hotel) rows.push(['閒置及收租損失（'+f(I.vacMonths,1)+' 個月）','−'+f(ic.loss)]);
      rows.push(['有效總收入',f(ic.egi)]);
      I.exp.forEach(function(x){ rows.push([x.name||'費用','−'+f(x.amt)]); });
      if (n(ic.expMult)!==1) rows.push(['費用加成（× '+f(ic.expMult,2)+'）','−'+f(ic.expRaw*(ic.expMult-1))]);
      if (ic.pctPart) rows.push([(n(I.opexPct)?'營業費用及成本 '+f(I.opexPct,1)+'%':'')+(n(I.opexPct)&&n(I.mgmtPct)?'、':'')+(n(I.mgmtPct)?'管理費 '+f(I.mgmtPct,1)+'%':''),'−'+f(ic.pctPart)]);
      rows.push(['建物折舊提存費','−'+f(ic.dep)],['淨收益（第 1 年）',f(ic.noi)]);
      T(['項目','金額（元）'], rows, {align:['l','r']});
      if (I.method==='dcf' && ic.flows){ var D=I.dcf;
        P('分析期間 '+D.years+' 年，折現率 '+f(D.disc,2)+'%；收入年成長率'+(n(D.switchYear)?'前 '+D.switchYear+' 年 '+f(D.rentGrowth,1)+'%、其後 '+f(D.rentGrowth2,1)+'%':' '+f(D.rentGrowth,1)+'%')+'；期末價值以第 '+(n(D.years)+1)+' 年淨收益 ÷ 期末資本化率 '+f(D.termCap,2)+'%，扣除處分費用 '+f(D.sellCost,1)+'%（§31、§32）。');
        T(['年期','有效總收入','總費用','淨收益','現值'], ic.flows.map(function(x){ return [String(x.k), f(x.egi), f(x.exp+x.dep), f(x.cf), f(x.pv)]; }).concat([['期末','','','期末價值 '+f(ic.terminal.value),f(ic.terminal.pv)]]), {align:['l','r','r','r','r'], small:true});
        P('收益價格 ＝ 各期淨收益現值合計 '+f(ic.terminal.pvFlows)+' 元 ＋ 期末價值現值 '+f(ic.terminal.pv)+' 元 ＝ '+f(ic.price)+' 元（'+unitTxt(ic.unit,S)+'）。');
      } else P('收益資本化率 '+f(ic.cap,2)+'%（'+(ctx.capName||'')+'），收益價格 ＝ 淨收益 ÷ 收益資本化率 ＝ '+f(ic.price)+' 元（'+unitTxt(ic.unit,S)+'）。');
    }
    function costSection(no){
      var ct=k.cost, K=c.cost;
      H3('（'+no+'）成本法');
      P('營造施工費採'+(K.conMethod==='items'?'工程造價項目法（直接法）':'單位面積比較法（間接法），單價每坪 '+f(K.unitCost,2)+' 萬元'+(n(ct.idx)!==1?' × 營造工程物價指數 '+f(ct.idx*100,2)+'%':'')+(K.unitCostNote?'，依'+K.unitCostNote:''))+'；累積折舊採'+({straight:'等速折舊（定額法）',declining:'初期加速折舊（定率法）',sinking:'初期減速折舊（償債基金法）'})[K.depMethod]+'（§68）。');
      T(['項目','金額（元）'], [['營造施工費',f(ct.construction)],['規劃設計費（'+f(K.design,1)+'%）',f(ct.design)]].concat(ct.extras?[['附加成本（裝修、設備等）',f(ct.extras)]]:[]).concat([
        ['廣告銷售、管理、稅捐',f(ct.fees)],['資本利息（'+f(K.interest,2)+'%）',f(ct.interest)],['開發或建築利潤（'+f(K.profit,1)+'%）',f(ct.profit)],['建物總成本',f(ct.T)],['累積折舊（'+f(ct.age)+'／'+f(K.life)+' 年）','−'+f(ct.dep)]])
        .concat(ct.extrasDep?[['附加成本累積折舊','−'+f(ct.extrasDep)]]:[]).concat([['建物成本價格',f(ct.building)],['土地價格（比較法，'+unitTxt(K.landUnit,S)+' × '+f(b.landShare,2)+' 坪'+(ct.extraLand?'＋其他土地 '+f(ct.extraLand):'')+'）',f(ct.land)],['房地成本價格',f(ct.price)]]), {align:['l','r']});
      P('房地成本價格為 '+f(ct.price)+' 元（'+unitTxt(ct.unit,S)+'）。土地價格以比較法求取（§69 II）。');
    }
    function landSection(no){
      var ld=k.land, Ld=c.land;
      H3('（'+no+'）土地開發分析法');
      P('V ＝ S ÷（1＋R）÷（1＋i）−（C＋M）（§81）。其中 S 為開發後預期總銷售金額，R 為適當之利潤率，i 為資本利息綜合利率，C 為直接成本，M 為間接成本。');
      if (ld.detailed){
        KV([['基地面積',f(n(Ld.site)||k.area,2)+' 坪'],['允建容積率',f(Ld.far,1)+'%'+(n(Ld.bonus)?'（含獎勵 '+f(Ld.bonus,1)+'%）':'')],['規劃樓層','地上 '+Ld.floorsAbove+' 層、地下 '+Ld.floorsBelow+' 層'],['容積樓地板面積',f(ld.farFloor,2)+' 坪'],['總樓地板面積',f(ld.total,2)+' 坪（地上 '+f(ld.above,2)+'、地下 '+f(ld.below,2)+'）'],['可銷售面積',f(ld.saleable,2)+' 坪'],['停車位',f(ld.cars)+' 個 × '+f(Ld.carPrice)+' 萬元']]);
        H3('銷售金額（比準層單價 × 樓層別效用比）');
        T(['樓層','銷售面積(坪)','效用比','單價','金額（萬元）'], ld.floors.map(function(x){ return [x.f+'F', f(x.area,2), f(x.util,0)+'%', unitTxt(x.unit,S), f(x.amt/10000,2)]; }).concat(ld.cars?[['車位',String(ld.cars)+' 個','','',f(ld.carAmt/10000,2)]]:[]).concat([['合計','','','',f(ld.S/10000,2)]]), {align:['l','r','r','r','r'], small:true});
        P('比準層單價以比較法求取為 '+unitTxt(Ld.baseUnit,S)+'（比準層 '+(Ld.baseFloor||4)+' 樓）。');
      } else T(['銷售項目','面積(坪)','單價','金額（元）'], Ld.sales.map(function(x){ return [x.name, f(x.ping,2), unitTxt(x.unit,S), f(n(x.ping)*n(x.unit)*10000)]; }), {align:['l','r','r','r']});
      var crow=[['總銷售金額 S',f(ld.S)],['直接成本 C（營造施工費'+(ld.detailed?' '+f(ld.total,2)+' 坪 × '+f(Ld.conUnit,2)+' 萬元'+(n(Ld.conIndex)&&n(Ld.conIndex)!==100?' × '+f(Ld.conIndex,2)+'%':''):'')+'）',f(ld.C)],['規劃設計費（'+f(Ld.design,1)+'% × C）',f(ld.design)],['廣告銷售、管理、稅捐（'+f(n(Ld.adSell)+n(Ld.mgmt)+n(Ld.tax),1)+'% × S）',f(ld.saleFees)],['間接成本 M',f(ld.M)],['利潤率 R',f(ld.R*100,2)+'%'],['資本利息綜合利率 i',f(ld.i*100,2)+'%'],['土地開發分析價格 V',f(ld.V)]];
      T(['項目','金額（元）'], crow, {align:['l','r']});
      if (ld.ci) T(['資本利息','比例','利率','說明'], [['自有資金',f(Ld.ownRatio,0)+'%',f(Ld.ownRate,2)+'%','一年期定存利率'],['借貸資金',f(100-n(Ld.ownRatio),0)+'%',f(Ld.loanRate,2)+'%','一般放款利率'],['建築投資（工期 '+Ld.buildMonths+' 個月 × ½）',f(ld.ci.wBld*100,2)+'%',f(ld.ci.bRate*100,2)+'%','依投資額加權'],['土地投資（持有 '+Ld.landMonths+' 個月）',f(ld.ci.wLand*100,2)+'%',f(ld.ci.lRate*100,2)+'%','依投資額加權'],['綜合利率','',f(ld.i*100,2)+'%','預售收入不計息（§58、§59）']], {align:['l','r','r','l']});
      P('土地開發分析價格為 '+unitTxt(ld.unit,S)+'。');
    }
    function specialSection(){
      var sp=k.special, cs=c.special;
      H3('特定價格：'+(cs.label||'特定條件'));
      P('依估價條件，以允建容積率 '+f(cs.far,1)+'% 試算完成時價格：比較法 '+unitTxt(sp.comp.unit,S)+'、土地開發分析法 '+unitTxt(sp.land.unit,S)+'，加權後為 '+unitTxt(sp.done,S)+'。');
      if (n(cs.years)>0) P('再以折現率 '+f(sp.rate,2)+'%'+(cs.rateMode==='input'?'':'（加權平均資金成本 '+f(sp.wacc,2)+'%＋流通性、風險性、增值性、管理性溢酬）')+'折現 '+f(cs.years,1)+' 年，折現比例 '+f(sp.df*100,2)+'%，決定特定價格為 '+unitTxt(sp.unit,S)+'，總價 '+spAmt+'。');
    }
  }

  /* ===== 摘要式不動產估價報告書（第十四號公報範本）=====
     數字只取自 calc 結果 k 與案件資料 c；唯一的運算是面積換算、公設比、加總、單位換算與淨值。沒有資料一律顯示待填。 */
  function buildSummary(c, k, v, ctx){
    ctx = ctx || {};
    var b=c.basic, a=c.appraiser, S=k.S, fin=k.fin, R=c.report||{}, X=(c.chk && typeof c.chk==='object')?c.chk:{}, out=[], land=!!k.isLand;
    var hasParcels = k.parcels && k.parcels.rows.length, caseNo = R.caseNo || c.id;
    var yuanTxt=function(y){ return y===null||y===undefined||isNaN(y) ? '⟦待填⟧' : f(Math.round(y),0); };
    var finTxt = fin.yuan===null||fin.yuan===undefined ? '⟦尚未決定⟧' : '新台幣 '+f(fin.yuan,0)+' 元';
    var P=function(t){ out.push({t:'p', text:t}); }, H1=function(t){ out.push({t:'h1', text:t}); }, H2=function(t){ out.push({t:'h2', text:t}); }, H3=function(t){ out.push({t:'h3', text:t}); };
    var KV=function(rows){ out.push({t:'kv', rows:rows}); }, T=function(head, rows, o){ out.push(Object.assign({t:'table', head:head, rows:rows}, o||{})); }, L=function(items, ord){ out.push({t:'list', items:items, ordered:ord!==false}); };
    var PB=function(){ out.push({t:'pb'}); };
    var ping=function(m2){ return Math.round(n(m2)*0.3025*100+1e-6)/100; };
    var areaTxt=function(x){ return n(x)>0 ? f(x,2) : '—'; };
    var numTxt=function(x){ return Number(x).toLocaleString('zh-TW',{maximumFractionDigits:4}); };
    var rate=function(x){ return f(100+n(x),2)+'%'; };
    var adopted=['comparison','income','cost','land'].filter(function(m){ return c.methods[m]; });
    var liens = Array.isArray(X.liens) ? X.liens : [];

    /* 一題勾選題 → 「■選中 □未選」文字 */
    function itemTxt(it){
      var val=X[it.k], t=it.type;
      if (t==='one' || t==='many'){
        var sel = (val===undefined||val===null||val==='') ? [] : [].concat(val), opts=it.opts.slice(); if (it.other) opts.push('其他');
        var s=opts.map(function(o){ return (sel.indexOf(o)>=0?'■':'□')+o; }).join('　');
        if (it.other && sel.indexOf('其他')>=0) s+='　其他：'+V(X[it.k+'_x'],'說明');
        return s; }
      if (t==='num') return (val===undefined||val===null||val==='') ? '⟦待填⟧'+(it.unit?' '+it.unit:'') : numTxt(val)+(it.unit?' '+it.unit:'');
      if (t==='yn') return val===true ? '■是　□否' : val===false ? '□是　■否' : '□是　□否';
      return V(val,'待填');
    }
    function groupRows(id){
      var g=SURVEY.filter(function(x){ return x.id===id; })[0];
      if (!g || (land && !g.land)) return null;
      var rows=g.items.filter(function(it){ return chkShown(c,it); }).map(function(it){ return [it.label, itemTxt(it)]; });
      return rows.length ? rows : null;
    }
    function groupKV(id, extra){ var rows=groupRows(id); if (!rows && !(extra&&extra.length)) return false; KV((extra||[]).concat(rows||[])); return true; }
    function lienLine(l){ return [l.kind, l.holder?'權利人 '+l.holder:'', n(l.amount)?'擔保債權總金額 '+f(l.amount,0)+' 元':(l.amount||'')].filter(Boolean).join('，'); }

    /* 封面 */
    out.push({t:'cover', office:a.office, title:'辦理金融機構不動產抵押貸款業務之不動產估價報告書', rows:[['案件編號',caseNo],['委託單位',V(b.client,'委託人')],['勘估標的',V(b.addr,'勘估標的')],['評估金額',finTxt],['勘察日期',roc(b.surveyDate)],['價格日期',roc(b.priceDate)]]});
    PB();
    /* 摘要表 */
    KV([['委託人',V(b.client,'委託人')],['案件編號',caseNo]]);
    H3('不動產坐落');
    var ar=(X.area && typeof X.area==='object')?X.area:{}, sum=0, com=0, arows=[];
    AREA_ROWS.forEach(function(r){ var m=n(ar[r[0]]); sum+=m; if (r[0]==='common1'||r[0]==='common2'||r[0]==='other') com+=m; });
    var landNos = hasParcels ? k.parcels.rows.map(function(r){ return (r.p.section||'')+(r.p.no?r.p.no+' 地號':''); }).join('、') : V(b.landNo,'地號');
    var sRows=[['土地', landNos, hasParcels?f(k.parcels.m2,2):'—', hasParcels?f(k.parcels.ping,2):'—', V(b.owner,'所有權人')]];
    if (!land){
      sRows.push(['建物', V(b.addr,'地址'), '', '', '']);
      AREA_ROWS.forEach(function(r){ var m=ar[r[0]]; sRows.push([r[1], r[0]==='main' ? V(b.bldgNo,'建號') : '—', areaTxt(m), n(m)>0?f(ping(m),2):'—', r[0]==='main'?V(b.owner,'所有權人'):'—']); });
      sRows.push(['合計', '公設比 '+(sum>0?f(com/sum*100,2)+'%':'—'), sum>0?f(sum,2):'—', sum>0?f(ping(sum),2):'—', '']);
    }
    T(['坐落及門牌','地號／建號','面積（㎡）','面積（坪）','所有權人'], sRows, {align:['l','l','r','r','l'], small:true});
    if (!land) P('註：公設比為（公設Ⅰ＋公設Ⅱ＋其他獨立產權）÷（主建物＋附屬建物＋公設Ⅰ＋公設Ⅱ＋其他獨立產權）；依範本公式以謄本面積明細計算。');
    H3('評估價值及土地增值稅');
    var tax = hasParcels && n(k.parcels.tax)>0 ? k.parcels.tax : null, net = (tax!==null && fin.yuan!==null && fin.yuan!==undefined) ? fin.yuan-tax : null;
    var costOn = !!c.methods.cost && k.cost, vRows=[];
    if (land) vRows.push(['土地', unitTxt(fin.unit,S), yuanTxt(fin.yuan), yuanTxt(tax), yuanTxt(net)]);
    else {
      vRows.push(['土地', costOn ? unitTxt(c.cost.landUnit,S) : '⟦待填⟧', costOn ? f(k.cost.land,0) : '⟦待填⟧', '—', '—']);
      vRows.push(['建物', '⟦待填⟧', costOn ? f(k.cost.building,0) : '⟦待填⟧', '—', '—']);
      vRows.push(['房地一體', unitTxt(fin.unit,S), yuanTxt(fin.yuan), yuanTxt(tax), yuanTxt(net)]);
    }
    T(['項目','單價','總價（元）','土地增值稅（元）','淨值（元）'], vRows, {align:['l','r','r','r','r'], small:true});
    if (!land){
      KV([['不含車位建坪單價','⟦待填⟧']]);
      P('註：車位價值：⟦待填⟧ 元，車位面積：⟦待填⟧ 坪。土地與建物分開之價格僅成本法有現成數值（土地為比較法求得、建物為成本價格），其餘待估價師填寫。');
    }
    H3('他項權利分析');
    if (X.noLien) KV([['備註','無他項權利設定']]);
    else if (liens.length) T(['項目'].concat(liens.map(function(l,i){ return '第 '+(i+1)+' 筆'; })), LIEN_COLS.map(function(col){ return [col[1]].concat(liens.map(function(l){ return l[col[0]]!==undefined&&l[col[0]]!==''?String(l[col[0]]):'—'; })); }), {small:true});
    else KV([['他項權利', b.encumbrance ? b.encumbrance : '⟦待填⟧']]);
    PB();

    /* 評估內容 */
    H1('評估內容');
    H2('一、委託人'); P(V(b.client,'委託人'));
    H2('二、勘估標的之基本資料');
    KV([['1.土地標示', hasParcels ? landNos+'；面積 '+f(k.parcels.m2,2)+' 平方公尺（'+f(k.parcels.ping,2)+' 坪）' : V(b.landNo,'地號')],
      ['2.建物標示', land ? '—' : V(b.bldgNo,'建號')+'；建物面積 '+f(b.area,2)+' 坪（'+f(n(b.area)*3.30579,2)+' 平方公尺）'],
      ['3.建物門牌', land ? '—' : V(b.addr,'門牌')]]);
    H2('三、價格日期及勘察日期'); KV([['價格日期',roc(b.priceDate)],['勘察日期',roc(b.surveyDate)]]);
    H2('四、價格種類'); P(b.priceType+(k.special?'及特定價格':''));
    H2('五、估價條件'); P(V(b.conditions,'估價條件'));
    H2('六、估價目的'); P(V(b.purpose,'估價目的'));
    H2('七、估價金額');
    var vl=[];
    if (c.methods.comparison && k.comp) vl.push('比較價格：建坪單價 '+unitTxt(k.comp.unit,S)); else vl.push('比較價格：未採用');
    vl.push(c.methods.income && k.inc ? '收益價格：新台幣 '+f(k.inc.price,0)+' 元（建坪單價 '+unitTxt(k.inc.unit,S)+'）' : '收益價格：未採用');
    if (c.methods.cost && k.cost) vl.push('成本價格：新台幣 '+f(k.cost.price,0)+' 元（建坪單價 '+unitTxt(k.cost.unit,S)+'）');
    vl.push('最終決定之估價金額：'+finTxt);
    L(vl);
    H2('八、勘估標的之所有權、他項權利及其他負擔');
    var lienTxt = X.noLien ? '■無設定　□有設定' : liens.length ? '□無設定　■有設定：'+liens.map(lienLine).join('；') : '□無設定　□有設定'+(b.encumbrance?'（'+b.encumbrance+'）':'');
    var t8=groupRows('title')||[]; KV(t8.concat([['他項權利及其他負擔', lienTxt]]));
    H2('九、勘估標的使用現況');
    ['use','ext','defect'].forEach(function(id){ groupKV(id); });
    H2('十、勘估標的法定使用管制或其他管制事項');
    groupKV('law', [['使用分區', V(b.zone,'使用分區')]]);
    H2('十一、價格形成之主要因素分析');
    var no=0, sub=function(t){ H3((++no)+'.'+t); };
    [['area','區域條件分析及區域建物使用'],['market','市場面分析']].forEach(function(g){ var rows=groupRows(g[0]); if (rows){ sub(g[1]); KV(rows); } });
    if (!land){ sub('標的結構及規劃'); KV([['標的結構',V(b.floorDesc,'結構')],['標的規劃',V(b.btype,'規劃')]]); }
    [['nuis','外在嫌惡設施及負面因素評估'],['site','宗地條件'],['bldg','建物個別條件'],['inner','建物內部條件評估'],['reflect','負面因素是否已反映於估值']].forEach(function(g){ var rows=groupRows(g[0]); if (rows){ sub(g[1]); KV(rows); } });
    H2('十二、估價所運用之方法與其估算過程及價格決定之理由');
    H3('（一）採用方法');
    P('本次價格評估考量產品特性及市場資訊，採用'+[['comparison','比較法'],['income','收益法'],['cost','成本法']].map(function(m){ return (c.methods[m[0]]?'■':'□')+m[1]; }).join('　')+(c.methods.land?'　■土地開發分析法':'')+'。');
    H3('（二）估價方法試算表');
    if (c.methods.comparison) compTable();
    if (c.methods.income) incomeTable();
    if (c.methods.cost) costTable();
    if (c.methods.land && k.land) P('土地開發分析法價格：'+unitTxt(k.land.unit,S)+'（詳細試算見敘述式報告）。');
    H3('（三）價格決定說明'); P(V(c.final.reason,'價格決定理由'));
    H2('十三、依不動產估價技術規則規定須敘明之情況');
    var n13=(v&&v.notes?v.notes.map(function(x){ return x.t+'（'+x.law+'）'; }):[]).concat(surveyDisclosures(c));
    if (n13.length) L(n13); else P('無。');
    H2('十四、其他與估價相關之必要事項');
    var oth=(c.other||'').split('\n').filter(Boolean); if (oth.length) L(oth); else P('無。');
    H2('十五、不動產估價師姓名及其證照字號');
    KV([['（一）不動產估價師',V(a.name)+(c.signed?'（已簽章，'+c.signedAt+'）':'（簽名或蓋章）')],['不動產估價師證書字號',V(a.certNo)],['不動產估價師開業證書字號',V(a.licenseNo)],['（二）不動產估價助理員','（簽名或蓋章）'],['登錄字號','⟦待填⟧']]);
    return out;

    function compTable(){
      var cc=k.comp, cm=c.comp.method, isD=cm==='diff';
      H3('比較法試算表');
      if (cm==='reg'){ var Rg=k.reg; P(!Rg||Rg.err ? '⟦計量模型尚無法估計⟧' : '採迴歸分析，樣本 '+Rg.n+' 筆，調整後判定係數 '+f(Rg.adjR2,3)+'。'); P('推定比較價格：'+unitTxt(cc.unit,S)); return; }
      if (!c.comps.length || !cc.rows || !cc.rows.length){ P('⟦尚未選擇比較標的⟧'); return; }
      var idx=[]; c.comps.forEach(function(cp,i){ if (cp.include!==false && idx.length<6) idx.push(i); });
      var more=c.comps.length-idx.length, line=function(lab, fn){ return [lab].concat(idx.map(function(i){ return fn(c.comps[i], cc.rows[i], i); })); };
      var adj=function(pctv, diffv){ return isD ? sg(diffv) : rate(pctv); };
      var rows=[
        line('坐落', function(cp){ return cp.loc||'—'; }),
        line('面積（坪）', function(cp){ return f(cp.area,2); }),
        line('屋齡（年）', function(cp){ return cp.age===''||cp.age===undefined?'—':String(cp.age); }),
        line('樓層', function(cp){ return cp.floor||'—'; }),
        line('單價（萬元/坪）', function(cp){ return f(cp.price,S.unitDec); }),
        line('總價（萬元）', function(cp){ return n(cp.area)>0&&n(cp.price)>0 ? f(n(cp.area)*n(cp.price),0) : '—'; }),
        line('資料來源', function(cp){ return cp.dataSrc||cp.src||'估價師蒐集'; }),
        line('價格日期', function(cp){ return cp.date||'—'; }),
        line('價格種類', function(cp){ return cp.priceType==='ask'?'擬售價':'成交價'; }),
        line('情況因素調整率', function(cp,r){ return adj(r.cond, r.cond); }),
        line('價格日期調整率', function(cp,r){ return adj(r.date, r.date); }),
        line('區域因素調整率', function(cp,r){ return adj(r.r, r.rv); }),
        line('個別因素調整率', function(cp,r){ return adj(r.i, r.iv); }),
        line('試算價格（萬元/坪）', function(cp,r){ return unitTxt(r.trial,S); }),
        line('個案調整權重', function(cp,r){ return r.usable ? f(r.weight,0)+'%' : '不採用'; }),
        line('加權後價格（萬元/坪）', function(cp,r){ return r.usable ? unitTxt(n(r.trial)*n(r.weight)/100,S) : '—'; })];
      T(['項次'].concat(idx.map(function(i){ return '比較標的 '+(c.comps[i].label||(i+1)); })), rows, {align:['l'].concat(idx.map(function(){ return 'r'; })), small:true});
      if (more>0) P('另有 '+more+' 件比較標的未列於本表（表格最多列 6 件）。');
      if (isD) P('調整欄位為差額法之加減金額（萬元/坪）。');
      P('推定比較價格：'+unitTxt(cc.unit,S)+'；經各項影響因素分析調整後，建坪單價以每坪 '+f(Math.round(n(cc.unit)*10000),0)+' 元評估。');
      var why=idx.filter(function(i){ return c.comps[i].condReason; }).map(function(i){ return '比較標的 '+(c.comps[i].label||(i+1))+'：'+c.comps[i].condReason; });
      P('調整說明：'+(why.length?why.join('；'):'⟦待填⟧'));
    }
    function incomeTable(){
      var ic=k.inc, I=c.income, A=n(k.area||b.area), tot=ic.egi-ic.noi;
      H3('收益法試算表（'+(I.method==='dcf'?'折現現金流量分析法':'直接資本化法')+'）');
      if (I.method==='dcf'){
        P('本案收益法採折現現金流量分析法（DCF）：分析期間 '+f(I.dcf.years)+' 年，折現率 '+f(I.dcf.disc,2)+'%，期末資本化率 '+f(I.dcf.termCap,2)+'%；收益價格 新台幣 '+f(ic.price,0)+' 元（建坪單價 '+unitTxt(ic.unit,S)+'）。');
        return; }
      T(['項目','內容'], [
        ['勘估標的面積（坪）', f(A,2)],
        ['評估毛租金（元/月）', ic.hotel ? '—' : f(ic.rent,0)],
        ['評估毛租金（元/坪/月）', ic.hotel||!(A>0) ? '—' : f(ic.rent/A,0)],
        ['總收入（元/年）', f(ic.gross,0)],
        ['押金或保證金利息及其他收入（元/年）', f(ic.other,0)],
        ['空置及其他損失', ic.hotel ? '—' : f(I.vacMonths,1)+' 個月（'+f(ic.loss,0)+' 元/年）'],
        ['有效總收入（元/年）', f(ic.egi,0)],
        ['費用率', ic.egi>0 ? f(tot/ic.egi*100,2)+'%' : '—'],
        ['總費用（元/年，含建物折舊提存費）', f(tot,0)],
        ['淨收入（元/年）', f(ic.noi,0)],
        ['收益資本化率（%）', f(ic.cap,2)],
        ['收益價格（元）', f(ic.price,0)],
        ['收益單價（元/坪）', f(Math.round(n(ic.unit)*10000),0)]], {align:['l','r']});
    }
    function costTable(){
      var ct=k.cost, K=c.cost;
      H3('成本法試算表');
      var rows=[
        ['建物結構', V(b.floorDesc,'結構'), ''],
        ['標的樓層/總樓層', (b.floorNum||'—')+'／'+(b.totalFloors||'—'), ''],
        ['土地價格', '土地單價 '+unitTxt(K.landUnit,S)+' × '+f(b.landShare,2)+' 坪'+(ct.extraLand?'＋其他土地 '+f(ct.extraLand,0)+' 元':''), f(ct.land,0)],
        ['營造或施工單價（元/坪）', K.conMethod==='items' ? '工程造價項目法' : f(Math.round(n(K.unitCost)*10000),0)+(n(ct.idx)!==1?'（× 物價指數 '+f(ct.idx*100,2)+'%）':''), ''],
        ['建物總面積（坪）', f(k.area||b.area,2), ''],
        ['直接成本：總值（元）', '', f(ct.construction,0)]];
      if (ct.extras) rows.push(['附加成本（裝修、設備等）','',f(ct.extras,0)]);
      rows.push(['規劃設計費','建物直接成本之 '+f(K.design,1)+'%',f(ct.design,0)],
        ['廣告銷售費、管理費、稅捐及其他負擔','建築總成本之 '+f(K.adSell,1)+'%、'+f(K.mgmt,1)+'%、'+f(K.tax,1)+'%（合計）',f(ct.fees,0)],
        ['間接成本小計','',f(n(ct.design)+n(ct.fees),0)],
        ['資本利息','建築直接成本與間接成本之 '+f(K.interest,2)+'%',f(ct.interest,0)],
        ['建物建築利潤','建物總成本之 '+f(K.profit,1)+'%',f(ct.profit,0)],
        ['建物總成本（元）','',f(ct.T,0)],
        ['建築完成日期', roc(b.completed), ''],
        ['屋齡（年）', f(ct.age), ''],
        ['耐用年數（年）', f(K.life), ''],
        ['建物殘值價格率（%）', f(K.salvage,1), ''],
        ['累積折舊', '', '−'+f(ct.dep,0)],
        ['建物成本價格（元）','',f(ct.building,0)],
        ['房地成本價格（元）','',f(ct.price,0)]);
      T(['項目','內容','金額（元）'], rows, {align:['l','l','r'], small:true});
    }
  }

  /* ---- 網頁呈現 ---- */
  function esc(x){ return String(x==null?'':x).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];}); }
  function inl(t){ return esc(t).replace(/⟦([^⟧]*)⟧/g,'<span class="ph">$1</span>'); }
  function toHTML(blocks){
    return blocks.map(function(bk){
      switch(bk.t){
        case 'cover': return '<div class="cover"><p class="office">'+inl(bk.office)+'</p><h1>'+inl(bk.title)+'</h1><table class="kvt">'+bk.rows.map(function(r){ return '<tr><th>'+inl(r[0])+'</th><td>'+inl(r[1])+'</td></tr>'; }).join('')+'</table></div>';
        case 'letter': return '<div class="letter"><p><b>'+inl(bk.to)+'</b>　公鑒：</p>'+bk.body.map(function(p){ return '<p class="indent">'+inl(p)+'</p>'; }).join('')+'<p class="right">'+inl(bk.office)+'　估價師 '+inl(bk.signer)+'　敬上</p>'+bk.certs.map(function(r){ return '<p class="right small">'+inl(r[0])+'：'+inl(r[1])+'</p>'; }).join('')+'</div>';
        case 'h1': return '<h2>'+inl(bk.text)+'</h2>';
        case 'h2': return '<h3>'+inl(bk.text)+'</h3>';
        case 'h3': return '<h4>'+inl(bk.text)+'</h4>';
        case 'p': return '<p>'+inl(bk.text)+'</p>';
        case 'amount': return '<p class="amount">'+inl(bk.text)+'</p>';
        case 'list': return (bk.ordered?'<ol>':'<ul>')+bk.items.map(function(x){ return '<li>'+inl(x)+'</li>'; }).join('')+(bk.ordered?'</ol>':'</ul>');
        case 'kv': return '<table class="kvt">'+bk.rows.map(function(r){ return '<tr><th>'+inl(r[0])+'</th><td>'+inl(r[1])+'</td></tr>'; }).join('')+'</table>';
        case 'table': return '<div class="tblx"><table'+(bk.small?' class="sm"':'')+'><thead><tr>'+bk.head.map(function(h){ return '<th>'+inl(h)+'</th>'; }).join('')+'</tr></thead><tbody>'+bk.rows.map(function(r){ return '<tr>'+r.map(function(x,i){ return '<td'+((bk.align||[])[i]==='r'?' class="r"':'')+'>'+inl(x)+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div>';
        case 'pb': return '<hr class="pb">';
      }
      return '';
    }).join('');
  }

  /* ---- Word（.docx）輸出：傳入 docx 函式庫 ---- */
  function toDocx(blocks, D, meta){
    meta = meta || {};
    var FONT={ascii:'Times New Roman', hAnsi:'Times New Roman', eastAsia:'標楷體'};
    var border={style:D.BorderStyle.SINGLE, size:4, color:'808080'};
    var cellBorders={top:border,bottom:border,left:border,right:border};
    function runs(text, o){ o=o||{}; var parts=String(text==null?'':text).split(/(⟦[^⟧]*⟧)/); return parts.filter(function(x){ return x!==''; }).map(function(p){ var ph=/^⟦/.test(p); return new D.TextRun({text: ph ? p.slice(1,-1) : p, bold:o.bold, size:o.size||24, font:FONT, highlight: ph ? 'yellow' : undefined}); }); }
    function para(text, o){ o=o||{}; return new D.Paragraph({children:runs(text,o), alignment:o.align, spacing:{after:o.after===undefined?120:o.after, line:o.line||360}, indent:o.indent, heading:o.heading, keepNext:o.keepNext}); }
    var CW=9070;
    function cellP(text, o){ o=o||{}; return new D.TableCell({borders:cellBorders, width:o.dxa?{size:o.dxa, type:D.WidthType.DXA}:undefined, shading:o.shade?{fill:'EEF2F1', type:D.ShadingType.CLEAR, color:'auto'}:undefined, margins:{top:40,bottom:40,left:80,right:80},
      children:[new D.Paragraph({children:runs(text,{size:o.size||20, bold:o.bold}), alignment:o.align==='r'?D.AlignmentType.RIGHT:D.AlignmentType.LEFT, spacing:{after:0, line:280}})]}); }
    function table(head, rows, align, small){
      var sz=small?17:20;
      var nc=(head||rows[0]||[]).length, first=nc>2?Math.round(CW*Math.min(0.3,1.6/(nc+0.6))):Math.round(CW*0.5), rest=nc>1?Math.floor((CW-first)/(nc-1)):CW, cw=[first].concat(Array(Math.max(0,nc-1)).fill(rest));
      var trs=[]; if (head) trs.push(new D.TableRow({tableHeader:true, children:head.map(function(h,i){ return cellP(h,{bold:true, shade:true, size:sz, dxa:cw[i]}); })}));
      rows.forEach(function(r){ trs.push(new D.TableRow({cantSplit:true, children:r.map(function(x,i){ return cellP(x,{align:(align||[])[i], size:sz, dxa:cw[i]}); })})); });
      return new D.Table({rows:trs, width:{size:CW, type:D.WidthType.DXA}, columnWidths:cw});
    }
    var children=[];
    blocks.forEach(function(bk){
      switch(bk.t){
        case 'cover':
          children.push(para(bk.office,{align:D.AlignmentType.CENTER, size:32, bold:true, after:600}));
          children.push(para(bk.title,{align:D.AlignmentType.CENTER, size:52, bold:true, after:800}));
          children.push(new D.Table({width:{size:CW,type:D.WidthType.DXA}, columnWidths:[2000,7070], rows:bk.rows.map(function(r){ return new D.TableRow({children:[cellP(r[0],{bold:true, shade:true, dxa:2000, size:26}), cellP(r[1],{dxa:7070, size:26})]}); })}));
          break;
        case 'letter':
          children.push(para(bk.to+'　公鑒：',{bold:true, size:26}));
          bk.body.forEach(function(p){ children.push(para(p,{indent:{firstLine:480}})); });
          children.push(para(bk.office+'　估價師 '+bk.signer+'　敬上',{align:D.AlignmentType.RIGHT, after:60}));
          bk.certs.forEach(function(r){ children.push(para(r[0]+'：'+r[1],{align:D.AlignmentType.RIGHT, size:20, after:0})); });
          break;
        case 'h1': children.push(para(bk.text,{heading:D.HeadingLevel.HEADING_1, bold:true, size:32, after:200, keepNext:true})); break;
        case 'h2': children.push(para(bk.text,{heading:D.HeadingLevel.HEADING_2, bold:true, size:28, after:120, keepNext:true})); break;
        case 'h3': children.push(para(bk.text,{heading:D.HeadingLevel.HEADING_3, bold:true, size:24, after:80, keepNext:true})); break;
        case 'p': children.push(para(bk.text,{indent:{firstLine:480}})); break;
        case 'amount': children.push(para(bk.text,{align:D.AlignmentType.CENTER, bold:true, size:32, after:240})); break;
        case 'list': bk.items.forEach(function(x,i){ children.push(para((bk.ordered?'（'+(SECT[i]||String(i+1))+'）':'')+x,{indent:{left:480, hanging:bk.ordered?480:0}})); }); break;
        case 'kv': children.push(new D.Table({width:{size:CW,type:D.WidthType.DXA}, columnWidths:[2540,6530], rows:bk.rows.map(function(r){ return new D.TableRow({cantSplit:true, children:[cellP(r[0],{bold:true, shade:true, dxa:2540}), cellP(r[1],{dxa:6530})]}); })})); children.push(para('',{after:80})); break;
        case 'table': children.push(table(bk.head, bk.rows, bk.align, bk.small)); children.push(para('',{after:80})); break;
        case 'pb': children.push(new D.Paragraph({children:[new D.PageBreak()]})); break;
      }
    });
    var header=new D.Header({children:[new D.Paragraph({alignment:D.AlignmentType.RIGHT, children:runs((meta.office||'')+'　案號 '+(meta.caseNo||''),{size:18})})]});
    var footer=new D.Footer({children:[new D.Paragraph({alignment:D.AlignmentType.CENTER, children:[new D.TextRun({children:['- ', D.PageNumber.CURRENT, ' -'], size:18, font:FONT})]})]});
    return new D.Document({creator:meta.office||'估價報告產生器', title:'不動產估價報告書 '+(meta.caseNo||''),
      styles:{default:{document:{run:{font:FONT, size:24}}}},
      sections:[{properties:{page:{size:{width:11906, height:16838}, margin:{top:1418, bottom:1418, left:1418, right:1418}}}, headers:{default:header}, footers:{default:footer}, children:children}]});
  }
  return {build:build, buildSummary:buildSummary, toHTML:toHTML, toDocx:toDocx, unitTxt:unitTxt, roc:roc};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = REPORT;
