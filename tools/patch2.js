function kindCard(c){
  return '<section class="card"><h2>標的類型 <span class="law">決定估價方法、因素細項、方法權重與報告格式</span></h2>'
   + ['土地','建物','商用'].map(function(g){ return '<div class="lbl" style="margin:0">'+g+'</div><div class="g3">'+KINDS.filter(function(x){ return x.group===g; }).map(function(x){ var on=c.kind===x.id;
       return '<button type="button" class="opt'+(on?' on':'')+'" data-act="setKind" data-v="'+x.id+'" aria-pressed="'+on+'"'+D()+'><span><b>'+esc(x.name)+'</b><span class="law">'+esc(x.hint)+'</span></span></button>'; }).join('')+'</div>'; }).join('')
   +'<div class="hint">切換類型會依估價模型重設採用的方法與權重；已輸入的資料都保留。</div></section>';
}
function parcelsCard(c, k){
  var land=isLandKind(c.kind), rows=c.parcels||[], pr=k.parcels?k.parcels.rows:[], dis=D(), S=k.S;
  var inp=function(i,key,num,w,step,lab){ return '<input class="ci'+(num?'':' txt')+'" '+(num?'type="number" step="'+(step||'any')+'" data-n="1"':'type="text"')+' style="width:'+w+'px" data-b="c.parcels.'+i+'.'+key+'" value="'+esc(rows[i][key])+'" aria-label="'+lab+'"'+dis+'>'; };
  var modeSel=function(i){ var m=rows[i].priceMode||'base'; return '<select class="ci" style="width:118px" data-b="c.parcels.'+i+'.priceMode" data-rr="1" aria-label="計價方式"'+dis+'>'+[['base','基地單價'],['announced','公告現值比例'],['manual','個別評定']].map(function(o){ return '<option value="'+o[0]+'"'+(m===o[0]?' selected':'')+'>'+o[1]+'</option>'; }).join('')+'</select>'; };
  var modeVal=function(i){ var m=rows[i].priceMode||'base'; return m==='announced'?inp(i,'annPct',true,58,'1','公告現值比例')+'%':m==='manual'?inp(i,'unit',true,70,'0.01','單價')+' 萬/坪':inp(i,'adjPct',true,58,'0.5','調整率')+'%'; };
  var head='<th>地段</th><th>地號</th><th>使用分區</th><th class="r">面積（㎡）</th><th class="r">權利範圍</th><th class="r">公告現值（元/㎡）</th><th class="r">前次移轉現值（元/㎡）</th><th>前次移轉年月</th><th class="r">物價指數（%）</th>'+(land?'<th>計價方式</th><th class="r">調整／比例／單價</th><th>說明</th><th class="r">單價</th>':'')+'<th class="r">增值稅（元）</th><th></th>';
  var body=rows.length?rows.map(function(p,i){ var r=pr[i]||{};
    return '<tr>'+'<td>'+inp(i,'section',false,90,'','地段')+'</td><td>'+inp(i,'no',false,64,'','地號')+'</td><td>'+inp(i,'zone',false,110,'','使用分區')+'</td><td class="r">'+inp(i,'areaM2',true,84,'0.01','面積')+'</td><td class="r">'+inp(i,'share',true,60,'0.0001','權利範圍')+'</td>'
      +'<td class="r">'+inp(i,'annVal',true,84,'1','公告現值')+'</td><td class="r">'+inp(i,'prevVal',true,84,'0.1','前次移轉現值')+'</td><td>'+inp(i,'prevDate',false,76,'','前次移轉年月')+'</td><td class="r">'+inp(i,'cpi',true,64,'0.1','物價指數')+'</td>'
      +(land?'<td>'+modeSel(i)+'</td><td class="r">'+modeVal(i)+'</td><td>'+inp(i,'note',false,140,'','說明')+'</td><td class="r num">'+(r.unit===null||r.unit===undefined?'—':fmt(r.unit,2))+'</td>':'')
      +'<td class="r num">'+(r.vat?fmt(r.vat.tax):'—')+'</td><td class="r"><button class="btn ghost xs" data-act="listRm" data-path="c.parcels" data-i="'+i+'"'+dis+'>刪除</button></td></tr>'; }).join('')
    :'<tr><td colspan="15" class="law">尚無土地</td></tr>';
  var tot=k.parcels?'<div class="small">合計 <b class="num">'+fmt(k.parcels.m2,2)+'</b> ㎡（<b class="num">'+fmt(k.parcels.ping,2)+'</b> 坪）'+(land?'；以基地單價計價 <b class="num">'+fmt(k.area,2)+'</b> 坪'+(k.parcels.total!==null?'；土地總價 <b class="num">'+fmt(k.parcels.total/10000,0)+'</b> 萬元':''):'')+'；土地增值稅合計 <b class="num">'+fmt(k.parcels.tax)+'</b> 元</div>':'';
  return '<section class="card"><h2>'+(land?'勘估標的土地（可多筆）':'基地土地標示')+' <span class="law">§7、§11；權利範圍以小數填（全部＝1）</span></h2>'
   +'<div class="tw ptab"><table class="t" style="min-width:'+(land?1500:1000)+'px"><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table></div>'
   +'<div><button class="btn ghost sm" data-act="listAdd" data-path="c.parcels" data-tpl="'+esc(JSON.stringify({section:rows[0]?rows[0].section:'', no:'', zone:rows[0]?rows[0].zone:'', areaM2:0, share:1, annVal:0, prevVal:0, prevDate:'', cpi:100, priceMode:'base', adjPct:0, annPct:30, unit:0, note:''}))+'"'+dis+'>＋ 新增一筆土地</button></div>'+tot
   +'<div class="hint">'+(land?'「基地單價」＝比較法與土地開發分析法決定的單價 ×（1＋調整率）；道路用地、農業區等難以比較者可改「公告現值比例」（§16 II(13) 須敘明理由）。':'')+'土地增值稅依土地稅法第 33 條一般稅率估算：公告現值 − 前次移轉現值 × 物價指數。</div></section>';
}
function dataSubject(c,k,M){
  var b='c.basic.', pt=c.basic.priceType, dl=districtsOf(c.basic.county), land=isLandKind(c.kind), kd=kindOf(c.kind), R='c.report.';
  return kindCard(c)
   +'<section class="card"><h2>本案使用的估價模型 <span class="law">事務所設定，在「參數與指標」維護</span></h2>'
   +'<div class="g2">'+F('估價模型','c.modelId',{sel:A.models.map(function(m){ return [m.id, m.name]; }),rr:true,hint:esc(M.note||'')})
   +'<div class="small" style="color:var(--ink2);align-self:end">比較標的選取、因素細項、經驗調整、方法權重、收益與開發參數都依模型帶入。'+(c.signed?'本案已簽名，使用簽名時的模型快照。':'')+'<div style="margin-top:6px"><button class="btn ghost sm" data-act="tab" data-v="params">開啟參數與指標</button></div></div></div></section>'
   +'<section class="card"><h2>勘估標的（'+esc(kd.name)+'） <span class="law">§7、§11（依登記謄本）</span></h2>'
   +'<div class="g3">'+F('縣市',b+'county',{sel:COUNTIES.map(function(x){ return x[1]; }),rr:true})+F('鄉鎮市區',b+'district',{sel:dl.length?dl:[''],rr:true})+F('路街名（供比較標的評分）',b+'road',{ph:'例：光明六路東一段',rr:true})+'</div>'
   + F(land?'坐落（地段地號或鄰近門牌）':'門牌地址',b+'addr')
   +'<div class="g3">'+(land?'':F('建號',b+'bldgNo'))+F(land?'地號（摘要用）':'基地地號',b+'landNo')+F('使用分區',b+'zone',{rr:true,hint:'用於比較標的「同使用分區類別」'})+'</div>'
   +(land?'':'<div class="g4">'+F('建物面積（坪）',b+'area',{num:true,step:'0.01',rr:true,hint:'以登記面積為準'})+F('基地持分（坪）',b+'landShare',{num:true,step:'0.01'})+F('所在樓層',b+'floorNum',{num:true,rr:true,hint:'整棟填 0'})+F('總樓層數',b+'totalFloors',{num:true,rr:true})+'</div>'
     +'<div class="g3">'+F('建物型態',b+'btype',{sel:BTYPES,rr:true,hint:'選項同實價登錄「建物型態」'})+F('建物完成日',b+'completed',{type:'date',rr:true})+F('構造說明',b+'floorDesc')+'</div>')
   +'<div class="g2">'+F('所有權人及權利範圍',b+'owner')+F('他項權利及其他負擔',b+'encumbrance')+'</div>'
   +'<div class="g2">'+F('限制登記（預告登記、查封等）',R+'restrict',{ph:'留空寫「查無預告登記、查封等限制登記情事」'})+F('法定使用管制補充',R+'zoneRule',{ph:'例：建蔽率 50%、容積率 150%'})+'</div></section>'
   +((c.parcels&&c.parcels.length)||land||c.kind!=='unit'?parcelsCard(c,k):'<section class="card"><h2>基地土地標示 <span class="law">選填，填了可估算土地增值稅</span></h2><button class="btn ghost sm" data-act="listAdd" data-path="c.parcels" data-tpl="'+esc(JSON.stringify({section:'',no:'',zone:'',areaM2:0,share:1,annVal:0,prevVal:0,prevDate:'',cpi:100,priceMode:'base',adjPct:0,annPct:30,unit:0,note:''}))+'"'+D()+'>＋ 加入基地地號</button></section>')
   +'<section class="card"><h2>估價基本事項 <span class="law">§6、§9</span></h2>'
   +'<div class="g3">'+F('估價目的',b+'purpose',{sel:PURPOSES,rr:true,hint:'收益參數依模型對此目的的設定'})+F('價格日期',b+'priceDate',{type:'date',rr:true})+F('勘察日期',b+'surveyDate',{type:'date'})+'</div>'
   +'<div class="g4">'+['正常價格','限定價格','特定價格','特殊價格'].map(function(x){return '<label class="opt'+(pt===x?' on':'')+'"><input type="radio" name="pt" data-b="c.basic.priceType" value="'+x+'"'+(pt===x?' checked':'')+D()+'><span>'+x+'</span></label>';}).join('')+'</div>'
   + F('估價條件',b+'conditions',{ta:true})
   + (pt==='特定價格'?F('同時估計之正常價格（萬元）',b+'normalPrice',{num:true,hint:'§6 II'}):'')
   +'</section>'
   +'<section class="card"><h2>委託 <span class="law">估價師法 §15</span></h2><div class="g3">'+F('委託人',b+'client')+F('酬金（元）',b+'fee',{num:true})+F('簽約日',b+'contractDate',{type:'date'})+'</div>'+F('工作範圍',b+'scope')+'</section>'
   +'<section class="card"><h2>估價師 <span class="law">§16 II(15)</span></h2><div class="g2">'+F('姓名','c.appraiser.name')+F('事務所','c.appraiser.office')+F('估價師證書字號','c.appraiser.certNo')+F('開業證書字號','c.appraiser.licenseNo')+F('開業證書有效期限','c.appraiser.licenseExp',{type:'date'})+F('所屬公會','c.appraiser.guild')+F('公會會員證書字號','c.appraiser.guildNo')+'</div></section>'
   +'<section class="card"><h2>報告書資料來源與其他負擔</h2>'+F('其他資料來源（寫入「估價資料來源說明」）',R+'dataSources',{ph:'例：委託人提供之營業報表、租約'})+F('其他負擔',R+'otherBurden')+'</section>'
   +'<section class="card"><h2>勘估標的資料從哪裡取得</h2><div class="small" style="color:var(--ink2);line-height:1.8">'
   +'<b>登記謄本</b>：全國地政電子謄本系統（需帳號，每張 20 元，費用併入 HiNet 帳單）；下載的 PDF 可交給 Claude 擷取地號、面積、權利範圍、公告現值與他項權利。<br>'
   +'<b>實價登錄</b>：內政部不動產交易實價查詢服務網開放資料，免費，每月 1、11、21 日更新。<br>'
   +'<b>使用分區、公告土地現值</b>：各縣市都市計畫查詢系統及地籍圖資服務。</div></section>';
}
function subjLine(c){ var b=c.basic, s=subj(c);
  if (s.land) return '<div class="box info">勘估標的：'+esc(b.county)+esc(b.district)+'・土地・'+esc(b.zone||'使用分區未填')+'・'+fmt(s.area,2)+' 坪・價格日期 '+esc(b.priceDate||'未填')+'（僅比對土地交易；屋齡、樓層條件不適用）</div>';
  return '<div class="box info">勘估標的：'+esc(b.county)+esc(b.district)+'・'+esc(b.btype)+'・'+esc(b.zone||'使用分區未填')+'・屋齡 '+fmt(s.age,1)+' 年・'+fmt(s.area,2)+' 坪・'+(s.floor||'—')+' 樓・價格日期 '+esc(b.priceDate||'未填')+'</div>'; }
function tabSurvey(c){
  var d='c.survey.d.', land=isLandKind(c.kind);
  return '<section class="card"><h2>現場勘察 <span class="law">§13</span></h2><div class="g2">'+CB('委託人已領勘','c.survey.led')+CB(land?'已進入基地勘察':'已進入室內勘察','c.survey.indoor')+'</div>'
   +'<div class="g3">'+F('照片／影像數量','c.survey.photos',{num:true})+F('增建、違建（§103）','c.survey.illegal',{sel:[['none','無'],['exclude','有，違建不評估'],['separate','有，另列價格']],rr:true})+F('領勘人及其說明','c.report.leader',{ph:'例：委託人指派○○先生領勘'})+'</div>'
   + F('現場勘察參考資料','c.report.surveyRefs')
   + F('使用現況（報告第 9 項）','c.survey.useStatus',{ta:true}) + F('委託人訪談紀錄','c.survey.notes',{ta:true}) +'</section>'
   +'<section class="card"><h2>標的條件描述</h2><div class="g2">'+F('交通',d+'traffic')+F('生活機能',d+'life')+F('學區',d+'school')+F('嫌惡設施',d+'nuisance')
   +(land?'':F('樓層',d+'floor')+F('景觀',d+'view')+F('採光通風',d+'light')+F('格局',d+'layout')+F('屋齡屋況',d+'cond')+F('管理',d+'mgmt'))+'</div>'
   +'<div><button class="btn ghost sm" data-act="draftFactors"'+D()+'>依描述重新產生區域、個別因素草稿</button></div></section>'
   + (expOf(MOD(c)).length?'<section class="card"><h2>勘估標的經驗調整條件 <span class="law">模型「'+esc(MOD(c).name)+'」</span></h2><div class="g2">'+expOf(MOD(c)).map(function(e){ return CB(esc(e.name)+' <span class="law">'+pct(e.pct)+'</span>','c.subjFlags.'+e.id); }).join('')+'</div><div class="hint">勾選後，比較法會依「勘估標的有、比較標的沒有」自動加減。</div></section>':'')
   +'<section class="card"><h2>價格形成之主要因素分析 <span class="law">§16 II(11)</span></h2>'
   + F('一般因素（須引用價格日期前的公開資料並附出處）','c.analysis.general',{ta:true}) + F('不動產市場概況（供需、價格水準、交易量）','c.report.market',{ta:true}) + F('區域因素','c.analysis.region',{ta:true}) + F('個別因素','c.analysis.indiv',{ta:true}) + F('最有效使用','c.analysis.hbu',{ta:true})
   + CB('<b>估價師已確認本段內容</b>','c.analysis.confirmed') +'</section>';
}
function tabComp(c,k){
  var M=k.M, S=k.S, n=c.comps.length, act=indsOf(M), ex=expOf(M), m=c.comp.method, land=isLandKind(c.kind);
  if (!c.methods.comparison) return '<div class="card"><p style="margin:0">本案未採比較法，可在「價格決定」勾選。</p></div>';
  var pick=PICK('c.comp.method',[['pct','百分率法','依優劣程度評定差異百分率（§19(5)，原則）'],['diff','差額法','依優劣程度評定差額，單位萬元/坪（§19(6)）'],['reg','計量模型分析法','以實價登錄資料迴歸推估（§19(7)、§20）']],'比較法採用的方法','§24');
  if (m==='reg') return pick + regPanel(c,k);
  var vol = land ? '<section class="card"><h2>土地容積地價換算 <span class="law">§24</span></h2><div class="g2">'+CB('比較標的先換算為每 100% 容積地價，再乘以勘估標的允建容積率','c.comp.volumeBasis')+F('勘估標的允建容積率（%）','c.comp.subjFar',{num:true,step:'0.1',rr:true})+'</div><div class="hint">實務作法：比較標的單價 ÷ 其容積率 × 勘估標的容積率，可消除不同使用強度的差異；比較標的請填「容積率」列。</div></section>' : '';
  var mode='<div class="card"><h2>調整輸入方式</h2><div class="g2"><label class="opt'+(c.comp.inputMode==='grade'?' on':'')+'"><input type="radio" name="im" data-b="c.comp.inputMode" value="grade"'+(c.comp.inputMode==='grade'?' checked':'')+D()+'><span><b>七級評定</b><span class="law">劣～優，每級'+(m==='diff'?'差額':'百分率')+'依模型「'+esc(M.name)+'」</span></span></label><label class="opt'+(c.comp.inputMode==='value'?' on':'')+'"><input type="radio" name="im" data-b="c.comp.inputMode" value="value"'+(c.comp.inputMode==='value'?' checked':'')+D()+'><span><b>拉桿／直接輸入</b><span class="law">'+(m==='diff'?'±5 萬元/坪':'±15%')+'範圍內調整</span></span></label></div></div>';
  var head='<div class="rowb"><div class="small">已選 '+n+' 件比較標的（最多 6 件）。正數表示勘估標的條件較佳。</div><span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ghost sm" data-act="goTab" data-v="data:sales">從實價登錄挑選</button><button class="btn ghost sm" data-act="addBlank"'+(n>=6?' disabled':'')+D()+'>＋ 空白比較標的</button></span></div>';
  if (!n) return pick+vol+mode+'<section class="card"><h2>比較標的</h2>'+head+'</section>';
  var tail = c.comps.map(function(cp,i){ var r=k.comp.rows[i], h='';
    if (cp.special) h+= F('比較標的 '+esc(cp.label)+' 情況調整說明（§23）','c.comps.'+i+'.condReason',{ph:'說明如何查證與量化'});
    if (r.viol15||r.viol30) h+= CB('比較標的 '+esc(cp.label)+' 超過調整上限，因性質或區位特殊、缺乏交易資料仍予採用（§25 但書）','c.comps.'+i+'.exception') + (cp.exception?F('理由','c.comps.'+i+'.exceptionReason'):'');
    return h; }).join('');
  var formula = m==='diff' ? '試算價格 ＝ 成交單價 ×（1 − 議價）×（1＋情況）×（1＋價格日期）＋ 區域差額小計 ＋ 個別差額小計'+(land&&c.comp.volumeBasis?'，再 × 容積率比':'')+'。' : '試算價格 ＝ 單價 ×（1 − 議價）×（1＋情況）×（1＋價格日期）×（1＋區域小計）×（1＋個別小計）'+(land&&c.comp.volumeBasis?' × 勘估標的容積率 ÷ 比較標的容積率':'')+'，取至小數兩位。';
  var grid = isM() ? compCards(c,k,act,ex) : compTable(c,k,act,ex);
  return pick+vol+mode+'<section class="card"><h2>比較標的調整'+(isM()?'':'表')+'</h2>'+head+grid+'<p class="hint" style="margin:0">'+formula+'</p>'+(tail?'<div class="stack">'+tail+'</div>':'')+'</section>'
   +'<div class="g2"><section class="card"><h2>法規檢核</h2><div data-o="compChecks"></div></section>'
   +'<section class="card bigfig"><div class="k">比較價格</div><div class="num" style="font-size:34px;line-height:1.1" data-o="compUnit"></div><div class="small" style="color:var(--band-muted)" data-o="compTotal"></div></section></div>';
}
function compTable(c,k,act,ex){
  var S=k.S, n=c.comps.length, m=c.comp.method, land=isLandKind(c.kind);
  function row(label, cells, law){ return '<tr><td>'+label+(law?' <span class="law">'+law+'</span>':'')+'</td>'+cells.join('')+'</tr>'; }
  function each(fn){ return c.comps.map(fn); }
  function txt(field, ph_){ return each(function(cp,i){ return '<td class="r"><input class="ci txt" style="width:112px" data-b="c.comps.'+i+'.'+field+'" value="'+esc(cp[field])+'" placeholder="'+ph_+'" aria-label="'+esc(cp.label+' '+ph_)+'"'+D()+'></td>'; }); }
  function num(field, step, suf){ return each(function(cp,i){ return '<td class="r"><input class="ci" type="number" step="'+step+'" data-b="c.comps.'+i+'.'+field+'" data-n="1" value="'+esc(cp[field])+'" aria-label="'+esc(cp.label+' '+field)+'"'+D()+'>'+(suf||'')+'</td>'; }); }
  function out(key){ return each(function(cp,i){ return '<td class="r num" data-o="'+key+'-'+i+'"></td>'; }); }
  var unitLbl = m==='diff' ? '（萬元/坪）' : '';
  function grp(g){ var inds=act.filter(function(x){return x.group===g;}), exs=ex.filter(function(x){return x.group===g;});
    return inds.map(function(ind){ return row((ind.cat?'<span class="law">'+esc(ind.cat)+'</span> ':'')+esc(ind.name), each(function(cp,i){ return '<td class="r">'+cellCtl(i,ind,c)+'</td>'; })); }).join('')
      + exs.map(function(e){ return '<tr><td>'+expLabel(e,c)+'</td>'+each(function(cp,i){ return '<td class="r">'+expCell(i,e,c)+'</td>'; }).join('')+'</tr>'; }).join(''); }
  var anyAsk = c.comps.some(function(cp){ return cp.priceType==='ask'; });
  return '<div class="tw"><table class="t" style="min-width:'+(260+n*150)+'px"><thead><tr><th>項目</th>'+each(function(cp,i){return '<th class="r">'+esc(cp.label)+' <button class="btn ghost xs" data-act="rmComp" data-i="'+i+'" aria-label="移除比較標的 '+esc(cp.label)+'"'+D()+'>移除</button></th>';}).join('')+'</tr></thead><tbody>'
    + row('資料來源', txt('dataSrc','例：實價登錄'))
    + row('位置', txt('loc','位置'))
    + (land ? row('使用分區', txt('zone','使用分區')) + row('容積率（%）', num('far','1')) + row('面積（坪）', num('area','0.01'))
            : row('樓層', txt('floor','樓層')) + row('屋齡（年）', num('age','1')))
    + row('交易年月', txt('date','YYYY-MM'))
    + row('價格型態', each(function(cp,i){ return '<td class="r"><select class="ci" style="width:104px" data-b="c.comps.'+i+'.priceType" data-rr="1" aria-label="'+esc(cp.label)+' 價格型態"'+D()+'><option value="deal"'+(cp.priceType!=='ask'?' selected':'')+'>成交價格</option><option value="ask"'+(cp.priceType==='ask'?' selected':'')+'>擬售價格</option></select></td>'; }), '§23')
    + '<tr class="sum"><td>單價（萬元/坪）</td>'+num('price','0.1').join('')+'</tr>'
    + (anyAsk ? row('議價空間', each(function(cp,i){ return cp.priceType==='ask' ? '<td class="r"><input class="ci" type="number" step="0.5" data-b="c.comps.'+i+'.bargain" data-n="1" value="'+esc(cp.bargain)+'" aria-label="'+esc(cp.label)+' 議價空間"'+D()+'>%</td>' : '<td class="r law">—</td>'; })) : '')
    + (land && c.comp.volumeBasis ? row('容積地價（每 100% 容積）', out('vp')) : '')
    + row('特殊交易', each(function(cp,i){ return '<td class="r"><select class="ci" style="width:120px" data-b="c.comps.'+i+'.special" data-rr="1" aria-label="'+esc(cp.label)+' 特殊交易"'+D()+'><option value="">無</option>'+SPECIALS.map(function(s){return '<option'+(cp.special===s?' selected':'')+'>'+esc(s)+'</option>';}).join('')+'</select></td>'; }), '§23')
    + row('情況調整', num('cond','0.1','%'), '§23')
    + row('價格日期調整', each(function(cp,i){ return S.dateMode==='auto' && !cp.dateManual
        ? '<td class="r num"><span data-o="date-'+i+'"></span> <button class="btn ghost xs" data-act="dateManual" data-i="'+i+'"'+D()+'>改手動</button></td>'
        : '<td class="r"><input class="ci" type="number" step="0.1" data-b="c.comps.'+i+'.dateAdj" data-n="1" value="'+esc(cp.dateAdj)+'" aria-label="'+esc(cp.label)+' 價格日期調整"'+D()+'>%'+(S.dateMode==='auto'?' <button class="btn ghost xs" data-act="dateAuto" data-i="'+i+'"'+D()+'>自動</button>':'')+'</td>'; }), S.dateMode==='auto'?'月變動率 '+pct(S.monthlyRate,2):'§19(2)')
    + '<tr class="grp"><td colspan="'+(n+1)+'">區域因素 '+unitLbl+'<span class="law">§19(3)</span></td></tr>' + grp('region')
    + '<tr class="sum"><td>區域因素小計</td>'+out('rs').join('')+'</tr>'
    + '<tr class="grp"><td colspan="'+(n+1)+'">個別因素 '+unitLbl+'<span class="law">§19(4)</span></td></tr>' + grp('indiv')
    + '<tr class="sum"><td>個別因素小計</td>'+out('is').join('')+'</tr>'
    + '<tr class="sum"><td>總調整率</td>'+out('tot').join('')+'</tr>'
    + row('差異百分率絕對值加總', out('abs'))
    + '<tr class="sum"><td>試算價格</td>'+out('trial').join('')+'</tr>'
    + (S.weightMode==='manual' ? '<tr><td>權重 <span class="law">§27</span></td>'+each(function(cp,i){ return '<td class="r">'+weightCtl(cp,i)+'</td>'; }).join('')+'</tr>' : row('權重', out('w'), S.weightMode==='deviation'?'依差異絕對值偏離率':'依總調整率反比'))
    + '<tr><td>狀態</td>'+out('st').join('')+'</tr>'
    + row('查證困難事項', txt('verifyIssue','留空表示已查證'), '§22 II')
    + '</tbody></table></div>';
}
function compCards(c,k,act,ex){
  var S=k.S, land=isLandKind(c.kind);
  function fr(label, ctl){ return '<div class="frow"><span>'+label+'</span><span style="text-align:right">'+ctl+'</span></div>'; }
  function inp(i, field, type, step, w){ return '<input class="ci'+(type==='text'?' txt':'')+'" '+(type==='text'?'type="text"':'type="number" step="'+step+'" data-n="1"')+' style="width:'+(w||84)+'px" data-b="c.comps.'+i+'.'+field+'" value="'+esc(c.comps[i][field])+'" aria-label="'+esc(c.comps[i].label+' '+field)+'"'+D()+'>'; }
  return '<div class="stack" style="gap:8px">'+c.comps.map(function(cp,i){
    var g=function(grp){ return act.filter(function(x){return x.group===grp;}).map(function(ind){ return fr(esc(ind.name), cellCtl(i,ind,c)); }).join('')
      + ex.filter(function(x){return x.group===grp;}).map(function(e){ var so=!!(c.subjFlags&&c.subjFlags[e.id]); return fr('經驗：'+esc(e.name)+' <span class="law">'+pct(e.pct)+(so?'・標的有':'')+'</span>', expCell(i,e,c)); }).join(''); };
    return '<details class="ccard" data-card="'+i+'"'+(A.ui.open===i?' open':'')+'><summary><span style="min-width:0"><b>'+esc(cp.label)+'</b>　'+esc(cp.loc||'未填位置')+'<br><span class="law">'+esc(cp.date||'—')+'・'+(cp.priceType==='ask'?'擬售':'成交')+' '+fmt(cp.price,1)+' 萬/坪・'+esc(cp.dataSrc||cp.src||'手動')+'</span></span><span style="text-align:right;flex:none"><span class="num" data-o="trial-'+i+'"></span><br><span data-o="st-'+i+'"></span></span></summary><div class="cbody">'
      + fr('單價（萬元/坪）', inp(i,'price','number','0.1'))
      + fr('價格型態', '<select class="ci" style="width:104px" data-b="c.comps.'+i+'.priceType" data-rr="1"'+D()+'><option value="deal"'+(cp.priceType!=='ask'?' selected':'')+'>成交價格</option><option value="ask"'+(cp.priceType==='ask'?' selected':'')+'>擬售價格</option></select>'+(cp.priceType==='ask'?' 議價 '+inp(i,'bargain','number','0.5',56)+'%':''))
      + fr('交易年月', inp(i,'date','text','',100))
      + (land ? fr('容積率／面積', inp(i,'far','number','1',64)+'% '+inp(i,'area','number','0.01',70)+' 坪') : fr('樓層／屋齡', inp(i,'floor','text','',60)+' '+inp(i,'age','number','1',56)))
      + fr('特殊交易 <span class="law">§23</span>', '<select class="ci" style="width:130px" data-b="c.comps.'+i+'.special" data-rr="1"'+D()+'><option value="">無</option>'+SPECIALS.map(function(s){return '<option'+(cp.special===s?' selected':'')+'>'+esc(s)+'</option>';}).join('')+'</select>')
      + fr('情況調整', inp(i,'cond','number','0.1',70)+'%')
      + fr('價格日期調整', S.dateMode==='auto'&&!cp.dateManual ? '<span class="num" data-o="date-'+i+'"></span> <button class="btn ghost xs" data-act="dateManual" data-i="'+i+'"'+D()+'>改手動</button>' : inp(i,'dateAdj','number','0.1',70)+'%')
      + '<div class="lbl" style="margin:6px 0 0">區域因素</div>' + g('region') + fr('<b>區域小計</b>','<b data-o="rs-'+i+'"></b>')
      + '<div class="lbl" style="margin:6px 0 0">個別因素</div>' + g('indiv') + fr('<b>個別小計</b>','<b data-o="is-'+i+'"></b>')
      + fr('總調整率','<span class="num" data-o="tot-'+i+'"></span>') + fr('試算價格','<b class="num" data-o="trial-'+i+'"></b>')
      + fr('權重 <span class="law">§27</span>', S.weightMode==='manual'?weightCtl(cp,i):'<span class="num" data-o="w-'+i+'"></span>')
      + fr('查證困難事項 <span class="law">§22</span>', inp(i,'verifyIssue','text','',150))
      + '<div><button class="btn ghost sm" data-act="rmComp" data-i="'+i+'"'+D()+'>移除比較標的 '+esc(cp.label)+'</button></div>'
      +'</div></details>'; }).join('')+'</div>';
}
function tabIncome(c,k){
  if (!c.methods.income) return '<div class="card"><p style="margin:0">本案未採收益法，可在「價格決定」勾選。</p></div>';
  var I=c.income, P=k.P, M=k.M, hotel=I.revMode==='hotel';
  var pick=PICK('c.income.method',[['direct','直接資本化法','未來一年淨收益 ÷ 收益資本化率（§29、§30）'],['dcf','折現現金流量分析法','各期淨收益與期末價值折現加總（§31、§32）']],'收益法採用的方法','§28');
  var rev=PICK('c.income.revMode',[['rent','租金收入','月租金 × 12，扣閒置及收租損失'],['hotel','旅館營運收入','客房數 × 平均房價 × 365 × 住房率']],'總收入推估方式','§36');
  var capPick='', capBody='';
  if (I.method==='direct'){
    capPick=PICK('c.income.capMode',[['input','直接輸入',''],['risk','風險溢酬法','§43(1)'],['extract','市場萃取法','§43(2)'],['wacc','加權平均資金成本法','§43(3)'],['dcr','債務保障比率法','§43(4)'],['egim','有效總收入乘數法','§43(5)']],'收益資本化率決定方法','§43');
    var m=I.capMode;
    if (m==='input') capBody='<div class="g2">'+SL('收益資本化率','c.income.cap',0.5,8,0.01,'%')+'</div>';
    if (m==='risk') capBody='<div class="g2">'+SL('基準報酬率（定存或公債）','c.income.risk.base',0,5,0.05,'%')+SL('流通性','c.income.risk.liquidity',-2,2,0.05,'%')+SL('風險性','c.income.risk.risk',-2,2,0.05,'%')+SL('增值性（預期增值為負）','c.income.risk.growth',-3,2,0.05,'%')+SL('管理難易','c.income.risk.mgmt',-1,2,0.05,'%')+'</div>';
    if (m==='extract') capBody=LIST('c.income.extract',[{key:'name',label:'比較標的'},{key:'noi',label:'年淨收益（元）',num:true,w:110},{key:'price',label:'價格（元）',num:true,w:120}],{tpl:{name:'',noi:0,price:0},addLabel:'新增萃取案例'});
    if (m==='wacc') capBody=LIST('c.income.wacc',[{key:'name',label:'資金來源'},{key:'w',label:'比例',num:true,suf:'%'},{key:'k',label:'利率或要求報酬率',num:true,step:'0.01',suf:'%'}],{tpl:{name:'',w:0,k:0},addLabel:'新增資金來源'});
    if (m==='dcr') capBody='<div class="g2">'+SL('債務保障比率','c.income.dcr.dcr',1,2,0.01,'倍')+SL('貸款利率','c.income.dcr.rate',0,8,0.05,'%')+SL('貸款年期','c.income.dcr.years',5,40,1,'年')+SL('貸款資金占價格比率','c.income.dcr.ltv',0,90,1,'%')+'</div><div class="hint">貸款常數 ＝ 利率 ÷［1 −（1＋利率）^−年期］＝ <span data-o="loanK"></span></div>';
    if (m==='egim') capBody='<div class="g2">'+SL('淨收益率（淨收益 ÷ 有效總收入）','c.income.egim.nir',10,100,0.5,'%')+SL('有效總收入乘數（價格 ÷ 有效總收入）','c.income.egim.egim',5,120,0.5,'倍')+'</div>';
    capBody='<section class="card"><h2>'+CAPNAMES[m]+'<span class="num" data-o="capOut"></span></h2>'+capBody+(P.capFloor>0?'<div class="hint">模型「'+esc(M.name)+'」對「'+esc(c.basic.purpose)+'」設定資本化率下限 '+fmt(P.capFloor,2)+'%，低於下限不能簽名。</div>':'')+'</section>';
  } else {
    capBody='<section class="card"><h2>折現現金流量參數 <span class="law">§31–§33</span></h2><div class="g2">'
      +SL('分析期間','c.income.dcf.years',3,20,1,'年',{rr:true})+SL('折現率','c.income.dcf.disc',0.5,10,0.01,'%')
      +SL('收入年成長率（第一階段）','c.income.dcf.rentGrowth',-3,6,0.1,'%')+SL('第一階段年數（0＝全期同一成長率）','c.income.dcf.switchYear',0,20,1,'年',{rr:true})
      +(Number(I.dcf.switchYear)>0?SL('收入年成長率（第二階段）','c.income.dcf.rentGrowth2',-3,6,0.1,'%'):'')+SL('費用年成長率','c.income.dcf.expGrowth',-3,5,0.1,'%')
      +SL('期末資本化率','c.income.dcf.termCap',0.5,10,0.01,'%')+SL('處分費用率','c.income.dcf.sellCost',0,8,0.1,'%')+'</div>'+CB('各期淨收益扣除建物折舊提存費','c.income.dcf.deductDep')+'<div data-o="dcfTable"></div></section>';
  }
  var revBody = hotel
    ? '<section class="card"><h2>旅館營運收入 <span class="law">§36；依營業報表、同級旅館統計</span></h2><div class="g2">'+SL('客房數','c.income.rooms',0,1000,1,'間')+SL('平均房價','c.income.adr',0,20000,50,'元')+SL('住房率','c.income.occ',0,100,0.5,'%')+SL('其他收入（占客房收入）','c.income.otherPct',0,100,0.5,'%',{hint:'餐飲、會議等'})+'</div>'
      + F('收入依據（寫入報告）','c.income.rentSource',{ph:'例：最近三年營業報表、觀光署旅館業營運統計'})
      +'<div class="lbl" style="margin:0">其他年收入（車位、店面出租等）</div>'+LIST('c.income.incomes',[{key:'name',label:'項目'},{key:'amt',label:'金額（元／年）',num:true,w:110}],{tpl:{name:'',amt:0},addLabel:'新增收入項目'})
      + CB('已蒐集最近三年收支資料（未勾選會寫入報告，§35 II）','c.income.threeYears')+'</section>'
    : '<section class="card"><h2>收入 <span class="law">§35–37</span></h2><div class="g2">'+SL('月租金','c.income.rent',0,200000,500,'元')+SL('閒置及收租損失','c.income.vacMonths',0,6,0.5,'月')+'</div>'
      + F('租金來源（寫入報告）','c.income.rentSource',{ph:'例：近鄰同型態租賃實例中位數'})
      +'<div><button class="btn ghost sm" data-act="goTab" data-v="data:rents">查實價登錄租金行情</button></div>'
      +'<div class="lbl" style="margin:0">其他年收入（押金運用收益、車位租金等）</div>'+LIST('c.income.incomes',[{key:'name',label:'項目'},{key:'amt',label:'金額（元／年）',num:true,w:110}],{tpl:{name:'',amt:0},addLabel:'新增收入項目'})
      + CB('已蒐集最近三年收支資料（未勾選會寫入報告，§35 II）','c.income.threeYears')+'</section>';
  return '<section class="card"><h2>模型「'+esc(M.name)+'」的收益參數 <span class="law">估價目的：'+esc(c.basic.purpose)+'</span></h2>'
   +'<div class="g3"><div class="ck"><span>閒置及收租損失預設</span><span class="num">'+fmt(M.income.vacMonths,1)+' 月</span></div><div class="ck"><span>資本化率預設／下限</span><span class="num">'+fmt(M.income.cap,2)+'% ／ '+(P.capFloor>0?fmt(P.capFloor,2)+'%':'無')+'</span></div><div class="ck"><span>費用加成</span><span class="num">× '+fmt(P.expMult,2)+'</span></div></div>'
   +'<div><button class="btn ghost sm" data-act="applyModelIncome"'+D()+'>把閒置月數與資本化率改回模型預設</button></div></section>'
   + pick + rev + revBody
   +'<section class="card"><h2>總費用 <span class="law">§38、§39</span></h2>'+LIST('c.income.exp',[{key:'name',label:'費用項目'},{key:'amt',label:'金額（元／年）',num:true,w:110}],{tpl:{name:'',amt:0},addLabel:'新增費用項目'})
   +'<div class="g2">'+SL(hotel?'營業成本及費用（占客房收入）':'營運費用（占收入）','c.income.opexPct',0,90,0.5,'%')+SL('管理費（占有效總收入）','c.income.mgmtPct',0,10,0.1,'%')+'</div>'
   +(Number(P.expMult)!==1?'<div class="box warn">依模型「'+esc(M.name)+'」，估價目的為「'+esc(c.basic.purpose)+'」時固定費用合計 × '+fmt(P.expMult,2)+' 計列。</div>':'')+'</section>'
   +'<section class="card"><h2>建物折舊提存費 <span class="law">§40、§40-1 等速折舊型</span></h2>'
   + F('建物總成本來源','c.income.costSource',{sel:[['cost','依成本法計算（§40-1）'],['manual','自行輸入']],rr:true})
   + (I.costSource==='manual'?'<div class="g3">'+F('建物總成本（元）','c.income.manualCost',{num:true})+'</div>':'')
   +'<div class="g2">'+SL('經濟耐用年數','c.income.life',10,80,1,'年')+SL('殘餘價格率','c.income.salvage',0,10,0.5,'%')+'</div></section>'
   + capPick + capBody
   +'<div class="g2"><section class="card"><h2>計算過程</h2><div data-o="incTable"></div></section><section class="card bigfig"><div class="k">收益價格</div><div class="num" style="font-size:34px;line-height:1.1" data-o="incUnit"></div><div class="small" style="color:var(--band-muted)" data-o="incTotal"></div></section></div>';
}
function tabCost(c){
  var k='c.cost.';
  return (c.methods.cost?'':'<div class="box info">本案未採成本法；此處參數仍用於收益法的建物總成本。要納入價格決定，請在「價格決定」勾選。</div>')
   + PICK(k+'conMethod',[['unit','單位面積比較法','標準單價 × 面積（§56 間接法）'],['items','工程造價項目法','逐項數量 × 單價（§55 直接法）']],'營造施工費求取方法','§54')
   +'<section class="card"><h2>營造施工費</h2>'
   + (c.cost.conMethod==='items' ? LIST(k+'items',[{key:'name',label:'工程項目'},{key:'qty',label:'數量',num:true,step:'0.01'},{key:'price',label:'單價（元）',num:true,w:100}],{tpl:{name:'',qty:0,price:0},addLabel:'新增工程項目',minW:480})
      : '<div class="g2">'+SL('營造施工費單價','c.cost.unitCost',5,40,0.01,'萬元/坪',{hint:'全聯會標準（§56）'})+SL('營造工程物價指數調整','c.cost.indexPct',80,130,0.01,'%',{hint:'價格日期指數 ÷ 標準表基期指數'})+'<div style="align-self:end"><div class="hint" style="margin-bottom:6px">來源：'+esc(c.cost.unitCostNote||'模型預設值')+'</div><button class="btn ghost sm" data-act="goTab" data-v="data:cost">從營造單價表選</button></div></div>'
        + F('單價來源說明（寫入報告）',k+'unitCostNote'))
   +'<div class="lbl" style="margin:0">附加成本（裝修、旅館設備等；可另計累積折舊）</div>'+LIST(k+'extras',[{key:'name',label:'項目'},{key:'amt',label:'金額（元）',num:true,w:120},{key:'depPct',label:'累積折舊率',num:true,step:'0.1',suf:'%',w:64}],{tpl:{name:'',amt:0,depPct:0},addLabel:'新增附加成本',minW:520})+'</section>'
   +'<section class="card"><h2>費用與利潤 <span class="law">§57–§61</span></h2><div class="g2">'+SL('規劃設計費率','c.cost.design',0,5,0.1,'%',{hint:'2%～3%（§57）'})+SL('資本利息綜合利率','c.cost.interest',0,8,0.01,'%')+SL('廣告銷售費率','c.cost.adSell',0,8,0.1,'%')+SL('管理費率','c.cost.mgmt',0,6,0.1,'%')+SL('稅捐及其他負擔費率','c.cost.tax',0,3,0.1,'%')+SL('開發或建築利潤率','c.cost.profit',0,30,0.5,'%')+'</div>'
   +'<div class="hint">廣告銷售、管理、稅捐依總成本乘以費率（§61）；資本利息、利潤依 §58、§60 的合計額計算，系統以聯立方式求解總成本。</div></section>'
   + PICK(k+'depMethod',[['straight','等速折舊','定額法'],['declining','初期加速折舊','定率法，殘餘價格率須大於 0'],['sinking','初期減速折舊','償債基金法']],'累積折舊路徑','§68')
   +'<section class="card"><h2>耐用年數與殘值 <span class="law">§65–§67</span></h2><div class="g2">'+SL('經濟耐用年數','c.cost.life',10,80,1,'年')+SL('殘餘價格率','c.cost.salvage',0,10,0.5,'%',{hint:'不超過 10%（§67）'})+(c.cost.depMethod==='sinking'?SL('償債基金利率','c.cost.sinkRate',0,6,0.05,'%'):'')+'</div>'
   + CB('手動調整已經歷年數（§68 II，會寫入報告）',k+'ageManual') + (c.cost.ageManual?'<div class="g2">'+SL('已經歷年數','c.cost.age',0,80,1,'年')+'</div>':'<div class="hint">已經歷年數依建物完成日至價格日期自動計算。</div>')+'</section>'
   +'<section class="card"><h2>土地價格 <span class="law">§69 II</span></h2><div class="g2">'+SL('土地單價（以比較法求取）','c.cost.landUnit',0,600,0.1,'萬元/坪',{hint:'× 基地持分 '+fmt(c.basic.landShare,2)+' 坪'})+F('其他土地價值（元，例如道路用地以公告現值計）','c.cost.extraLand',{num:true})+'</div></section>'
   +'<div class="g2"><section class="card"><h2>計算過程</h2><div data-o="costTable"></div></section><section class="card bigfig"><div class="k">成本價格</div><div class="num" style="font-size:34px;line-height:1.1" data-o="costUnit"></div><div class="small" style="color:var(--band-muted)" data-o="costTotal"></div></section></div>';
}
function tabLand(c,k){
  var L_='c.land.', Ld=c.land, det=Ld.mode==='detailed';
  var head=(c.methods.land?'':'<div class="box info">本案未採土地開發分析法。適用於以開發為前提之宗地（§87），要納入價格決定，請在「價格決定」勾選。</div>')
   + PICK(L_+'mode',[['detailed','依容積推算（實務格式）','基地 × 容積率 → 樓地板面積 → 比準層單價 × 樓層別效用比'],['simple','直接輸入銷售項目','自行輸入各銷售項目面積與單價']],'開發規劃方式','§72–§75');
  var plan;
  if (det){
    plan='<section class="card"><h2>開發規劃 <span class="law">§72、§73；依法定建蔽率、容積率</span></h2><div class="g3">'
      +F('基地面積（坪，0＝依土地合計）',L_+'site',{num:true,step:'0.01',hint:'目前計算用 '+fmt(Number(Ld.site)||k.area,2)+' 坪'})+F('允建容積率（%）',L_+'far',{num:true,step:'0.1'})+F('容積獎勵（%）',L_+'bonus',{num:true,step:'0.1'})+'</div>'
      +'<div class="g2">'+SL('地上樓層','c.land.floorsAbove',1,60,1,'層',{rr:true})+SL('地下樓層','c.land.floorsBelow',0,8,1,'層')+SL('開挖率','c.land.digRate',0,100,1,'%')+SL('地上總樓地板 ÷ 容積樓地板','c.land.freeFactor',1,2,0.01,'倍',{hint:'含梯廳、陽台等免計容積'})+SL('可銷售面積 ÷ 容積樓地板','c.land.saleFactor',1,2.5,0.01,'倍',{hint:'銷坪比'})+SL('一樓面積 ÷ 標準層','c.land.firstFloorRatio',0.3,1.5,0.01,'倍')+'</div></section>'
      +'<section class="card"><h2>銷售單價 <span class="law">§75；比準層以比較法求取</span></h2><div class="g2">'+SL('比準層單價','c.land.baseUnit',0,300,0.1,'萬元/坪')+SL('比準層樓層','c.land.baseFloor',1,40,1,'樓')+SL('一樓效用比','c.land.util1F',100,400,1,'%')+SL('每層效用比遞增','c.land.utilStep',0,5,0.1,'%',{hint:'比準層以上每層加、以下每層減'})
      +SL('車位數（0＝依地下面積推估）','c.land.cars',0,500,1,'個')+SL('每車位面積','c.land.pingPerCar',8,40,0.5,'坪')+SL('車位單價','c.land.carPrice',0,600,1,'萬元/個')+'</div><div data-o="floorTable"></div></section>'
      +'<section class="card"><h2>直接成本與間接成本 <span class="law">§76–§78</span></h2><div class="g2">'+SL('營造施工費單價','c.land.conUnit',5,40,0.01,'萬元/坪')+SL('營造工程物價指數','c.land.conIndex',80,130,0.01,'%')
      +SL('規劃設計費率（營造費）','c.land.design',0,5,0.1,'%')+SL('廣告銷售費率（總銷售）','c.land.adSell',0,8,0.1,'%')+SL('管理費率（總銷售）','c.land.mgmt',0,6,0.1,'%')+SL('稅捐費率（總銷售）','c.land.tax',0,3,0.1,'%')+SL('適當利潤率 R','c.land.profit',0,40,0.5,'%')+'</div></section>';
  } else {
    plan='<section class="card"><h2>開發後可銷售面積與單價 <span class="law">§74、§75</span></h2>'+LIST(L_+'sales',[{key:'name',label:'銷售項目'},{key:'ping',label:'可銷售面積（坪）',num:true,step:'0.01'},{key:'unit',label:'銷售單價（萬元/坪）',num:true,step:'0.1'}],{tpl:{name:'',ping:0,unit:0},addLabel:'新增銷售項目',minW:480})+'</section>'
      +'<section class="card"><h2>直接成本與間接成本 <span class="law">§76–§78</span></h2><div class="g2">'+SL('營造樓地板面積','c.land.floorArea',0,20000,10,'坪')+SL('營造施工費單價','c.land.conUnit',5,40,0.1,'萬元/坪')
      +SL('規劃設計費率（營造費）','c.land.design',0,5,0.1,'%')+SL('廣告銷售費率（總銷售）','c.land.adSell',0,8,0.1,'%')+SL('管理費率（總銷售）','c.land.mgmt',0,6,0.1,'%')+SL('稅捐費率（總銷售）','c.land.tax',0,3,0.1,'%')+SL('適當利潤率 R','c.land.profit',0,40,0.5,'%')+'</div></section>';
  }
  var iopts=(det?[['table','資本利息試算表','自有／借貸資金加權，建築投資計一半工期、土地投資計全期']]:[]).concat([['formula','依 §79 公式','年利率 ×（土地價值比率＋建物價值比率 × ½）× 開發年數'],['input','直接輸入','資本利息負擔特殊時（§79 II）']]);
  var im=Ld.iMode==='table'&&!det?'formula':Ld.iMode, ibody;
  if (im==='input') ibody='<div class="g2">'+SL('資本利息綜合利率 i','c.land.iInput',0,20,0.01,'%')+'</div>';
  else if (im==='table') ibody='<div class="g2">'+SL('自有資金比例','c.land.ownRatio',0,100,1,'%')+SL('自有資金利率（一年期定存）','c.land.ownRate',0,6,0.01,'%')+SL('借貸資金利率（一般放款）','c.land.loanRate',0,10,0.01,'%')+SL('建築工期','c.land.buildMonths',6,72,1,'個月')+SL('土地持有期間','c.land.landMonths',6,96,1,'個月')+'</div><div data-o="ciTable"></div>';
  else ibody='<div class="g2">'+SL('資本利息年利率','c.land.annualRate',0,8,0.05,'%',{hint:'§58、§59'})+SL('土地價值比率','c.land.landRatio',0,100,1,'%')+SL('開發年數','c.land.years',0.5,10,0.5,'年',{hint:'§80'})+'</div>';
  return head + plan + PICK(L_+'iMode',iopts,'資本利息綜合利率','§79') + '<section class="card"><h2>資本利息</h2>'+ibody+'</section>'
   +'<div class="g2"><section class="card"><h2>計算過程 <span class="law">§81</span></h2><div data-o="landTable"></div></section><section class="card bigfig"><div class="k">土地開發分析價格</div><div class="num" style="font-size:30px;line-height:1.1" data-o="landTotal"></div><div class="small" style="color:var(--band-muted)" data-o="landUnit"></div></section></div>';
}
function tabFinal(c,k){
  var m=c.methods, on=['comparison','income','cost','land'].filter(function(x){return m[x];}), P=k.P, M=k.M, mw=c.final.useModelWeights, W=modelWeights(c,M,P), land=isLandKind(c.kind), kw=(M.kindWeights||{})[c.kind];
  var pw=['comparison','income','cost','land'].filter(function(x){ return Number(W[x])>0; }).map(function(x){ return MNAMES[x]+' '+W[x]+'%'; }).join('、');
  var sp=c.special;
  return '<section class="card"><h2>採用的估價方法 <span class="law">§14：應兼採二種以上</span></h2><div class="g2">'+CB('比較法','c.methods.comparison')+CB('收益法','c.methods.income')+CB('成本法','c.methods.cost')+CB('土地開發分析法','c.methods.land')+'</div>'
   +(on.length===1?F('只採一種方法的理由','c.methods.singleReason',{ta:true}):'')
   + F('方法選定說明（選填，寫入報告）','c.report.methodReason',{ph:'例：勘估標的為住宅區素地，近鄰土地交易資料充足，且可依法定強度規劃開發'})
   + (on.length<4?F('未採用其他方法的理由（選填）','c.report.notUsedReason',{ph:'例：區域內無類似土地租賃案例，收益法不適用'}):'')+'</section>'
   +'<section class="card"><h2>各方法價格與權重 <span class="law">§15</span></h2>'
   + (on.length>1?CB('依估價模型「'+esc(M.name)+'」'+(kw?'對「'+esc(kindOf(c.kind).name)+'」':'對「'+esc(c.basic.purpose)+'」')+'的權重：'+(pw||'未設定'),'c.final.useModelWeights'):'')
   +'<div class="g2">'
   + on.map(function(x){ return '<div class="stack" style="gap:6px"><div class="small" style="color:var(--muted)">'+MNAMES[x]+'</div><div class="num" style="font-size:22px" data-o="f_'+x+'"></div>'+(on.length>1?(mw?'<div class="small">權重 <b class="num">'+fmt(W[x]||0,0)+'%</b>（模型）</div>':SL('權重','c.final.w.'+x,0,100,1,'%')):'')+'</div>'; }).join('')
   +'</div><div data-o="wsum"></div><div data-o="diffBox"></div>'+(on.length>1?CB('已就金額顯著差異重新檢討（§15）','c.final.reviewed'):'')
   + F('價格決定理由（報告第 12 項）','c.final.reason',{ta:true}) +'<div><button class="btn ghost sm" data-act="draftReason"'+D()+'>依目前權重產生理由草稿</button></div></section>'
   +'<section class="card bigfig"><div class="k">決定之估價金額</div><div class="num" data-o="fUnit"></div><div style="font-family:var(--f-display);font-size:30px;font-weight:700;line-height:1.2" data-o="fTotal"></div><div class="small" style="color:var(--band-muted)" data-o="fCn"></div></section>'
   +((c.parcels||[]).length?'<section class="card"><h2>逐筆價格與土地增值稅 <span class="law">價格結論明細表</span></h2><div data-o="parcelOut"></div></section>':'')
   +(land?'<section class="card"><h2>特定價格 <span class="law">§2(3)、§6 II；例如都市更新、容積移轉後的價值</span></h2>'+CB('同時評估特定價格','c.special.enabled')
     +(sp.enabled?'<div class="g3">'+F('特定條件名稱','c.special.label')+F('條件下允建容積率（%）','c.special.far',{num:true,step:'0.1'})+F('折現年數','c.special.years',{num:true,step:'0.1',hint:'0＝不折現'})+'</div>'
       +'<div class="g2">'+SL('比較法權重','c.special.w.comparison',0,100,1,'%')+SL('土地開發分析法權重','c.special.w.land',0,100,1,'%')+'</div>'
       + F('折現率決定方式','c.special.rateMode',{sel:[['wacc','加權平均資金成本＋風險溢酬'],['input','直接輸入']],rr:true})
       +(sp.rateMode==='input'?'<div class="g2">'+SL('折現率','c.special.rateInput',0,15,0.01,'%')+'</div>'
         :'<div class="g2">'+SL('自有資金比例','c.special.ownRatio',0,100,1,'%')+SL('自有資金利率','c.special.ownRate',0,6,0.01,'%')+SL('借貸資金利率','c.special.loanRate',0,10,0.01,'%')+SL('流通性溢酬','c.special.prem.liquidity',0,5,0.05,'%')+SL('風險性溢酬','c.special.prem.risk',0,5,0.05,'%')+SL('增值性溢酬','c.special.prem.growth',-3,5,0.05,'%')+SL('管理性溢酬','c.special.prem.mgmt',0,5,0.05,'%')+'</div>')
       +'<div data-o="specialOut"></div>':'')+'</section>':'')
   +'<section class="card"><h2>其他與估價相關之必要事項 <span class="law">§16 II(14)</span></h2>'+F('一行一項','c.other',{ta:true})+'</section>';
}
function tabParams(){
  var p=modelById(A.pModel), sub=A.paramSub, usedBy=A.cases.filter(function(c){ return c.modelId===p.id && !c.signed; }).length, body;
  var head='<section class="card"><h2>估價模型 <span class="law">事務所層級設定；每個案件選一個模型</span></h2>'
   +'<div class="g3">'+F('編輯中的模型','a.pModel',{sel:A.models.map(function(m){ return [m.id,m.name]; }),rr:true,free:true})+F('模型名稱','p.name',{free:true,rr:true})+F('說明','p.note',{free:true})+'</div>'
   +'<div class="rowb"><span class="small">'+usedBy+' 件未簽名案件使用中；更新日 '+esc(p.updated)+'。法定門檻只能設得更嚴，不能放寬。</span><span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ghost sm" data-act="dupModel">複製此模型</button><button class="btn ghost sm" data-act="useModel"'+(cur().modelId===p.id?' disabled':'')+D()+'>本案改用此模型</button><button class="btn ghost sm" data-act="delModel"'+(A.models.length<2?' disabled':'')+'>刪除模型</button></span></div>'
   +'<div class="diffmap">'+DIFFS.map(function(d){ return '<a href="#" data-act="sub" data-k="paramSub" data-v="'+d[0]+'"><b>'+d[1]+'</b><span>'+d[2]+'</span></a>'; }).join('')+'</div></section>';
  var tabs=SUB('paramSub',[['model','模型比較'],['select','選取規則'],['adjust','因素細項與經驗調整'],['weights','類型、目的與方法權重'],['income','收益參數'],['lda','土地開發參數'],['sources','資料來源'],['cost','成本參數'],['texts','報告書範本條文'],['check','檢核門檻']]);
  if (sub==='select') body=pSelect(p); else if (sub==='adjust') body=pAdjust(p); else if (sub==='weights') body=pWeights(p); else if (sub==='income') body=pIncome(p); else if (sub==='lda') body=pLda(p); else if (sub==='sources') body=pSources(p); else if (sub==='cost') body=pCost(p); else if (sub==='texts') body=pTexts(p); else if (sub==='check') body=pCheck(p); else body=pModels(p);
  return head+tabs+body;
}
function pSetKey(p){ var s=A.pSet||setKey(cur()); if (!p.indicatorSets) p.indicatorSets=defaultIndicatorSets(); if (!p.indicatorSets[s]) p.indicatorSets[s]=defaultIndicatorSet(s); return s; }
function pAdjust(p){
  var sk=pSetKey(p), arr=p.indicatorSets[sk], base='p.indicatorSets.'+sk+'.';
  var setPick='<div class="g3">'+Object.keys(FACTOR_SETS).map(function(key){ var on=sk===key; return '<button type="button" class="opt'+(on?' on':'')+'" data-act="pSet" data-v="'+key+'" aria-pressed="'+on+'"><span><b>'+esc(FACTOR_SETS[key].name)+'</b><span class="law">'+KINDS.filter(function(x){ return x.set===key; }).map(function(x){ return x.name; }).join('、')+'</span></span></button>'; }).join('')+'</div>';
  var indRows = arr.map(function(ind,i){ var b=base+i+'.'; return '<tr><td><input type="checkbox" data-b="'+b+'on" data-rr="1"'+(ind.on?' checked':'')+' aria-label="啟用 '+esc(ind.name)+'"></td>'
    +'<td><select class="ci" data-b="'+b+'group" data-rr="1" aria-label="分類"><option value="region"'+(ind.group==='region'?' selected':'')+'>區域因素</option><option value="indiv"'+(ind.group==='indiv'?' selected':'')+'>個別因素</option></select></td>'
    +'<td><input class="ci txt" style="width:96px" data-b="'+b+'cat" data-rr="1" value="'+esc(ind.cat||'')+'" aria-label="大類"></td>'
    +'<td><input class="ci txt" style="width:150px" data-b="'+b+'name" data-rr="1" value="'+esc(ind.name)+'" aria-label="細項名稱"></td>'
    +'<td class="r"><span style="display:inline-flex;gap:4px;align-items:center"><input type="range" min="0" max="5" step="0.5" style="width:70px;accent-color:var(--accent)" data-b="'+b+'step" data-n="1" value="'+esc(ind.step)+'" aria-label="每級百分率拉桿"><input class="ci" style="width:56px" type="number" step="0.5" min="0" data-b="'+b+'step" data-n="1" value="'+esc(ind.step)+'" aria-label="每級百分率">%</span></td>'
    +'<td class="r"><span style="display:inline-flex;gap:4px;align-items:center"><input type="range" min="0" max="3" step="0.1" style="width:70px;accent-color:var(--accent)" data-b="'+b+'stepAmt" data-n="1" value="'+esc(ind.stepAmt)+'" aria-label="每級差額拉桿"><input class="ci" style="width:56px" type="number" step="0.1" min="0" data-b="'+b+'stepAmt" data-n="1" value="'+esc(ind.stepAmt)+'" aria-label="每級差額">萬</span></td>'
    +'<td class="r"><button class="btn ghost xs" data-act="rmInd" data-i="'+i+'">刪除</button></td></tr>'; }).join('');
  var expRows = (p.exp||[]).map(function(e,i){ var b='p.exp.'+i+'.'; var sets=e.sets||['bldg','land','ind'];
    return '<tr><td><input type="checkbox" data-b="'+b+'on" data-rr="1"'+(e.on?' checked':'')+' aria-label="啟用 '+esc(e.name)+'"></td>'
    +'<td><input class="ci txt" style="width:170px" data-b="'+b+'name" data-rr="1" value="'+esc(e.name)+'" aria-label="條件名稱"></td>'
    +'<td><select class="ci" data-b="'+b+'group" data-rr="1" aria-label="分類"><option value="region"'+(e.group==='region'?' selected':'')+'>區域因素</option><option value="indiv"'+(e.group==='indiv'?' selected':'')+'>個別因素</option></select></td>'
    +'<td class="r"><span style="display:inline-flex;gap:4px;align-items:center"><input type="range" min="-10" max="10" step="0.5" style="width:80px;accent-color:var(--accent)" data-b="'+b+'pct" data-n="1" value="'+esc(e.pct)+'" aria-label="調整率拉桿"><input class="ci" style="width:60px" type="number" step="0.5" data-b="'+b+'pct" data-n="1" value="'+esc(e.pct)+'" aria-label="調整率">%</span></td>'
    +'<td>'+[['bldg','建物'],['land','土地'],['ind','工業']].map(function(s){ return '<label class="law" style="margin-right:6px"><input type="checkbox" data-act-set="'+i+'" value="'+s[0]+'"'+(sets.indexOf(s[0])>=0?' checked':'')+'> '+s[1]+'</label>'; }).join('')+'</td>'
    +'<td class="r"><button class="btn ghost xs" data-act="rmExp" data-i="'+i+'">刪除</button></td></tr>'; }).join('');
  return '<section class="card"><h2>比較法因素細項與七級級距 <span class="law">§2(15)(16)、§19(5)(6)；依標的類型分三套</span></h2>'+setPick
   +'<div class="tw"><table class="t" style="min-width:820px"><thead><tr><th>啟用</th><th>分類</th><th>大類</th><th>細項</th><th class="r">每級（百分率法）</th><th class="r">每級（差額法，萬元/坪）</th><th></th></tr></thead><tbody>'+indRows+'</tbody></table></div>'
   +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-act="addInd" data-g="region">＋ 區域因素細項</button><button class="btn ghost sm" data-act="addInd" data-g="indiv">＋ 個別因素細項</button><button class="btn ghost sm" data-act="resetInd">恢復這一套的預設</button></div></section>'
   +'<section class="card"><h2>事務所經驗調整表 <span class="law">固定條件的慣用調整率</span></h2>'
   +'<div class="box info">勘估標的有、比較標的沒有時加上此百分率；比較標的有、勘估標的沒有時減去；兩者都有則不調整。勾選適用的標的類型。</div>'
   +'<div class="tw"><table class="t" style="min-width:760px"><thead><tr><th>啟用</th><th>條件</th><th>分類</th><th class="r">調整率</th><th>適用</th><th></th></tr></thead><tbody>'+(expRows||'<tr><td colspan="6" class="law">尚無項目</td></tr>')+'</tbody></table></div>'
   +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-act="addExp">＋ 經驗調整條件</button><button class="btn ghost sm" data-act="resetExp">恢復預設</button></div></section>';
}
function pWeights(p){
  var cols=['comparison','income','cost','land'];
  if (!p.kindWeights) p.kindWeights=defaultKindWeights();
  var krows=KINDS.map(function(kd){ var w=p.kindWeights[kd.id];
    if (!w) return '<tr><td>'+esc(kd.name)+'</td><td colspan="5" class="law">依估價目的（下表）<button class="btn ghost xs" data-act="kwOn" data-v="'+kd.id+'">改為類型權重</button></td></tr>';
    var b='p.kindWeights.'+kd.id+'.', s=cols.reduce(function(a,x){ return a+(Number(w[x])||0); },0);
    return '<tr><td>'+esc(kd.name)+'</td>'+cols.map(function(x){ return '<td class="r"><input class="ci" style="width:58px" type="number" step="5" min="0" max="100" data-b="'+b+x+'" data-n="1" data-rr="1" value="'+esc(w[x])+'" aria-label="'+esc(kd.name+' '+MNAMES[x])+'">%</td>'; }).join('')+'<td class="r num '+(s===100?'pos':'neg')+'">'+s+'%</td><td class="r"><button class="btn ghost xs" data-act="kwOff" data-v="'+kd.id+'">改依目的</button></td></tr>'; }).join('');
  var rows=PURPOSES.map(function(pu){ var r=p.purpose[pu]||(p.purpose[pu]={w:{comparison:80,income:20,cost:0,land:0},capFloor:0,expMult:1}), b='p.purpose.'+pu+'.', s=cols.reduce(function(a,x){ return a+(Number(r.w[x])||0); },0);
    return '<tr><td>'+esc(pu)+'</td>'+cols.map(function(x){ return '<td class="r"><input class="ci" style="width:58px" type="number" step="5" min="0" max="100" data-b="'+b+'w.'+x+'" data-n="1" data-rr="1" value="'+esc(r.w[x])+'" aria-label="'+esc(pu+' '+MNAMES[x]+' 權重')+'">%</td>'; }).join('')
      +'<td class="r num '+(s===100?'pos':'neg')+'">'+s+'%</td>'
      +'<td class="r"><input class="ci" style="width:60px" type="number" step="0.05" min="0" data-b="'+b+'capFloor" data-n="1" value="'+esc(r.capFloor)+'" aria-label="'+esc(pu)+' 資本化率下限">%</td>'
      +'<td class="r">× <input class="ci" style="width:56px" type="number" step="0.05" min="0" data-b="'+b+'expMult" data-n="1" value="'+esc(r.expMult)+'" aria-label="'+esc(pu)+' 費用加成"></td></tr>'; }).join('');
  return '<section class="card"><h2>標的類型 × 方法權重 <span class="law">優先於估價目的；實務報告多為兩法各 50%</span></h2>'
   +'<div class="tw"><table class="t" style="min-width:700px"><thead><tr><th>標的類型</th>'+cols.map(function(x){ return '<th class="r">'+MNAMES[x]+'</th>'; }).join('')+'<th class="r">合計</th><th></th></tr></thead><tbody>'+krows+'</tbody></table></div></section>'
   +'<section class="card"><h2>估價目的 × 方法權重 <span class="law">§15：依目的、資料可信度決定</span></h2>'
   +'<div class="tw"><table class="t" style="min-width:760px"><thead><tr><th>估價目的</th>'+cols.map(function(x){ return '<th class="r">'+MNAMES[x]+'</th>'; }).join('')+'<th class="r">合計</th><th class="r">資本化率下限</th><th class="r">費用加成</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
   +'<div class="hint">類型沒有設定權重時（例如區分所有建物），依估價目的帶入；資本化率下限與費用加成一律依目的。§15 II：以契約租金作為證券化信託利益分配基礎者，DCF 收益價格應給較大權重。</div></section>';
}
function pLda(p){
  var s='p.lda.'; if (!p.lda) p.lda={};
  return '<section class="card"><h2>土地開發分析法預設值（新案件） <span class="law">§76–§80</span></h2><div class="g2">'
   +SL('適當利潤率',s+'profit',0,40,0.5,'%',{free:true})+SL('規劃設計費率',s+'design',0,5,0.1,'%',{free:true})+SL('廣告銷售費率',s+'adSell',0,8,0.1,'%',{free:true})+SL('管理費率',s+'mgmt',0,6,0.1,'%',{free:true})+SL('稅捐費率',s+'tax',0,3,0.1,'%',{free:true})
   +SL('自有資金比例',s+'ownRatio',0,100,1,'%',{free:true})+SL('自有資金利率',s+'ownRate',0,6,0.01,'%',{free:true})+SL('借貸資金利率',s+'loanRate',0,10,0.01,'%',{free:true})+'</div></section>'
   +'<section class="card"><h2>規劃與效用比預設</h2><div class="g2">'+SL('地上總樓地板 ÷ 容積樓地板',s+'freeFactor',1,2,0.01,'倍',{free:true})+SL('銷坪比',s+'saleFactor',1,2.5,0.01,'倍',{free:true})+SL('一樓面積 ÷ 標準層',s+'firstFloorRatio',0.3,1.5,0.01,'倍',{free:true})
   +SL('一樓效用比',s+'util1F',100,400,1,'%',{free:true})+SL('每層效用比遞增',s+'utilStep',0,5,0.1,'%',{free:true})+SL('比準層樓層',s+'baseFloor',1,40,1,'樓',{free:true})+SL('每車位面積',s+'pingPerCar',8,40,0.5,'坪',{free:true})+'</div></section>';
}
function pTexts(p){
  if (!p.texts) p.texts=defaultTexts();
  return '<section class="card"><h2>報告書範本條文 <span class="law">依全聯會第二號公報「敘述式估價報告書範本」整理；一行一條</span></h2>'
   +'<div class="g3">'+F('報告書有效期間（月）','p.texts.validMonths',{num:true,free:true})+'</div>'
   + F('估價立場聲明','p.texts.stance',{ta:true,free:true,lines:true})
   + F('估價報告書基本聲明事項','p.texts.assumptions',{ta:true,free:true,lines:true})
   + F('估價報告書使用之限制條件','p.texts.limits',{ta:true,free:true,lines:true})
   +'<div><button class="btn ghost sm" data-act="resetTexts">恢復範本預設</button></div></section>';
}
function pCheck(p){
  var s='p.settings.';
  return '<section class="card"><h2>比較標的權重 <span class="law">§27</span></h2><div class="g2">'+F('權重方式',s+'weightMode',{sel:[['manual','手動（拉桿）'],['deviation','依差異百分率絕對值偏離率（實務常用）'],['inverse','依總調整率反比自動分配']],rr:true,free:true,hint:'偏離率：w＝max(0, 2 − 各標的差異絕對值加總 ÷ 平均) ÷ 件數'})+'</div></section>'
   +'<section class="card"><h2>檢核門檻 <span class="law">法定值不可放寬</span></h2><div class="g2">'
   +SL('單項及小計上限',s+'lim15',5,15,0.5,'%',{free:true,hint:'§25 法定 15'})+SL('總調整率上限',s+'lim30',10,30,0.5,'%',{free:true,hint:'§25 法定 30'})+SL('試算價格差距上限',s+'gapLim',5,20,0.5,'%',{free:true,hint:'§26 法定 20'})+SL('最少比較標的',s+'minComps',3,6,1,'件',{free:true,hint:'§27 法定 3'})
   +SL('方法間顯著差異門檻',s+'diffThreshold',5,50,1,'%',{free:true,hint:'§15 未定義數值'})+F('總調整率算法',s+'totalMode',{sel:[['abs','各項淨調整率絕對值加總'],['compound','連乘後的淨變動']],free:true,hint:'§25 未定義算法'})+'</div></section>'
   +'<section class="card"><h2>數字捨入與單位</h2><div class="g3">'+F('單價取至',s+'unitDec',{sel:[[1,'0.1 萬元（千元）'],[2,'0.01 萬元（百元）'],[0,'1 萬元']],num:true,free:true})+F('總價取至',s+'totalDec',{sel:[[0,'萬元'],[1,'千元']],num:true,free:true})+F('報告書金額單位',s+'unitDisplay',{sel:[['wan','萬元'],['yuan','元']],free:true,rr:true})+'</div></section>'
   +'<section class="card"><h2>示範資料</h2><p class="small" style="margin:0">資料只存在這個瀏覽器。重設會清除所有修改、模型與匯入資料。</p><div><button class="btn ghost" data-act="resetAll">重設為範例資料</button></div></section>';
}
