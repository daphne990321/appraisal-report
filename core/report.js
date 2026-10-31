
/* ===== 報告書結構（依全聯會第二號公報「敘述式估價報告書範本」章節） =====
   reportBlocks() 產生與輸出格式無關的區塊，網頁與 Word 共用。
   文字中以 ⟦…⟧ 標示待填欄位。 */
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
  return {build:build, toHTML:toHTML, toDocx:toDocx, unitTxt:unitTxt, roc:roc};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = REPORT;
