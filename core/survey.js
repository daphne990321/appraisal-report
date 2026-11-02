/* ===== 階段 C：現勘與摘要式報告書的勾選題定義 =====
   依據：全聯會第十四號公報附件「摘要式不動產估價報告書範本」（115-06-01 起適用）與注意須知第四、六點。
   題目、選項都是資料：拿到各銀行實際格式後只改這裡，畫面與報告依此產生。
   答案存在案件 c.chk[key]：one＝字串、many＝字串陣列、num＝數字、text＝字串、yn＝true/false。
   step：在哪一步填（docs 調資料、survey 現勘、decide 決定價格）；land：土地案件是否顯示（預設建物才顯示）。
   show：條件顯示 {k:另一題, v:值或值陣列}；other：選「其他」時多一格說明（存在 key+'_x'）。 */
var SURVEY = [
  {id:'title', step:'docs', title:'產權與謄本狀況', law:'公報摘要式第八項', land:true, items:[
    {k:'titleStatus', label:'產權狀況', type:'many', opts:['產權清楚','查封登記','預告登記','未辦保存登記'], other:true},
    {k:'copyStatus', label:'謄本狀況', type:'one', opts:['完整','只申請節本','查無謄本']},
    {k:'copyParts', label:'節本部數', type:'num', unit:'部', show:{k:'copyStatus', v:'只申請節本'}},
    {k:'ownerRel', label:'建物及土地關連性', type:'one', opts:['同屬一人','分屬不同人']},
    {k:'ownerRelN', label:'分屬人數', type:'num', unit:'人', show:{k:'ownerRel', v:'分屬不同人'}}
  ]},
  {id:'use', step:'survey', title:'使用現況', law:'公報摘要式第九項', land:true, items:[
    {k:'entered', label:'是否入內勘察', type:'one', opts:['已入內','未能入內'], hint:'未能入內時報告會自動揭露（注意須知四）'},
    {k:'photoByClient', label:'內部照片由委託人提供', type:'yn', show:{k:'entered', v:'未能入內'}},
    {k:'useNow', label:'使用現況', type:'one', opts:['自用','出租','閒置','使用借貸','過戶中','無法判斷'], other:false},
    {k:'useNow_x', label:'無法判斷的說明', type:'text', show:{k:'useNow', v:'無法判斷'}},
    {k:'bldgUse', label:'整棟建物使用型態', type:'text', ph:'例：1 樓店面、2 樓以上住家'}
  ]},
  {id:'ext', step:'survey', title:'增建與約定', law:'公報摘要式第九項', items:[
    {k:'ext', label:'增建情形', type:'one', opts:['無','有']},
    {k:'extPing', label:'增建面積', type:'num', unit:'坪', show:{k:'ext', v:'有'}},
    {k:'extPos', label:'增建位置', type:'text', show:{k:'ext', v:'有'}, ph:'例：頂樓、陽台外推'},
    {k:'extStruct', label:'增建結構', type:'text', show:{k:'ext', v:'有'}, ph:'例：鐵皮'},
    {k:'extDoor', label:'增建物有獨立出入口', type:'yn', show:{k:'ext', v:'有'}},
    {k:'parkAgree', label:'車位分管協議及圖說', type:'one', opts:['是','否','無法判斷','無車位']},
    {k:'exclAgree', label:'約定專用協議', type:'one', opts:['是','否','無法判斷']}
  ]},
  {id:'defect', step:'survey', title:'瑕疵建物', law:'公報摘要式第九項', items:[
    {k:'defect', label:'標的是否為瑕疵建物', type:'many', opts:['否','海砂屋','輻射屋','事故屋','結構安全疑慮'], other:true}
  ]},
  {id:'nuis', step:'survey', title:'外在嫌惡設施及負面因素', law:'公報摘要式第十一項之 6、注意須知六（三）', land:true, items:[
    {k:'nuis', label:'嫌惡設施（可複選）', type:'many', opts:['無','死巷','路沖','反弓路','基地低於路面','天橋旁','地下道兩側','電線桿','高壓電塔','變電所','神壇或廟旁','近鐵路','工廠林立','瓦斯行','墳場','殯儀館','特種行業','近高架道路','瓦斯槽','加油站','焚化爐','垃圾場旁','棟距窄、隱私及採光差','車輛無法進出'], other:true},
    {k:'nuisNote', label:'嫌惡設施補充說明（種類、距離、規模）', type:'text', show:{k:'nuis', not:['無']}}
  ]},
  {id:'site', step:'survey', title:'宗地條件', law:'公報摘要式第十一項之 8', land:true, items:[
    {k:'roadW', label:'臨接道路寬度', type:'one', opts:['未達 4 公尺','4～未達 6 公尺','6～未達 10 公尺','10～未達 15 公尺','15～未達 20 公尺','20～未達 30 公尺','30 公尺以上']},
    {k:'frontM', label:'基地主要臨路面寬', type:'num', unit:'公尺'},
    {k:'depthM', label:'基地深度', type:'num', unit:'公尺'},
    {k:'noRoad', label:'未臨路', type:'yn'},
    {k:'terrain', label:'相對地勢', type:'one', opts:['平坦','陡峭','低窪','高低起伏','緩升','緩降'], other:true},
    {k:'lane', label:'基地包含既成巷道', type:'one', opts:['否','是']},
    {k:'lanePing', label:'既成巷道約占', type:'num', unit:'坪', show:{k:'lane', v:'是'}},
    {k:'shareUse', label:'持分式透天：實際使用與持分面積比較', type:'one', opts:['不適用','相當','大於','小於']},
    {k:'shareDiff', label:'相差約', type:'num', unit:'坪', show:{k:'shareUse', v:['大於','小於']}}
  ]},
  {id:'bldg', step:'survey', title:'社區與車位', law:'公報摘要式第十一項之 9', items:[
    {k:'community', label:'社區名稱', type:'text'},
    {k:'households', label:'總戶數', type:'num', unit:'戶'},
    {k:'guard', label:'門禁及管理員', type:'one', opts:['有','無']},
    {k:'sizeMix', label:'社區主要規劃坪數', type:'one', opts:['20 坪以下及套房','20～35 坪','35～50 坪'], other:true},
    {k:'bldgVacancy', label:'所屬大樓或社區空屋率', type:'num', unit:'%'},
    {k:'maint', label:'社區管理維護', type:'one', opts:['良好','尚可','不佳']},
    {k:'gas', label:'天然氣', type:'one', opts:['有','無']},
    {k:'b1Reg', label:'地下室登記用途', type:'one', opts:['無','防空避難室兼停車場','停車場','住家','商業用'], other:true},
    {k:'b1Use', label:'地下室使用狀況', type:'one', opts:['無','防空避難室兼停車場','停車場','住家','商業用','閒置'], other:true},
    {k:'parkOwn', label:'停車位所有權', type:'one', opts:['無','有']},
    {k:'parkOwnN', label:'車位數', type:'num', unit:'個', show:{k:'parkOwn', v:'有'}},
    {k:'parkOwnFl', label:'車位樓層', type:'text', show:{k:'parkOwn', v:'有'}, ph:'例：B2'},
    {k:'parkKind', label:'車位型式', type:'one', opts:['平面式','機械式'], show:{k:'parkOwn', v:'有'}},
    {k:'parkNo', label:'車位編號', type:'text', show:{k:'parkOwn', v:'有'}},
    {k:'parkUse', label:'停車位使用權', type:'one', opts:['無','有']},
    {k:'parkUseN', label:'使用權車位數', type:'num', unit:'個', show:{k:'parkUse', v:'有'}},
    {k:'parkEase', label:'停車位使用難易度', type:'one', opts:['良好','普通','不佳']},
    {k:'parkWhy', label:'不佳原因', type:'many', opts:['受柱位影響難停','位於路底需迴車','位於機械式下層車位移動不便'], other:true, show:{k:'parkEase', v:'不佳'}}
  ]},
  {id:'inner', step:'survey', title:'建物內部條件', law:'公報摘要式第十一項之 10', items:[
    {k:'inner', label:'內部條件', type:'one', opts:['良好','尚可','不佳','未入內履勘，無法確認']},
    {k:'innerWhy', label:'不佳原因（可複選）', type:'many', opts:['暗房','暗廳','客廳或房間有過樑','轉管','室內淨高太低','傾斜','牆面、樑柱龜裂','屋內滲漏水','屋形不方正','樓梯間狹窄，出入不便','樓梯間髒亂','鄰棟間距過窄','隔局差，使用效益低'], other:true, show:{k:'inner', v:'不佳'}}
  ]},
  {id:'law', step:'survey', title:'法定使用管制', law:'公報摘要式第十項', land:true, items:[
    {k:'zoneKind', label:'坐落分區', type:'one', opts:['都市計畫地區','非都市計畫地區'], hint:'使用分區名稱填在「調資料」的使用分區欄'},
    {k:'landClass', label:'使用地類別', type:'text', show:{k:'zoneKind', v:'非都市計畫地區'}},
    {k:'lawLimit', label:'法令特殊因素', type:'many', opts:['無','山坡地限制區','行水區限制區','航高限制區','斷層帶限制區'], other:true}
  ]},
  {id:'area', step:'decide', title:'區域條件', law:'公報摘要式第十一項之 1、2', land:true, items:[
    {k:'mktKm', label:'一般生活所需的市場或購物中心距離', type:'num', unit:'公里'},
    {k:'schoolKm', label:'最近的國中或國小距離', type:'num', unit:'公里'},
    {k:'envQ', label:'小區域環境品質', type:'one', opts:['良好','尚可','不佳']},
    {k:'roadQ', label:'聯外道路狀況', type:'one', opts:['良好','尚可','不佳']},
    {k:'transit', label:'大眾運輸系統', type:'one', opts:['良好','尚可','不佳（需自駕）']},
    {k:'g1Pct', label:'區域地面層作為某用途的比例', type:'num', unit:'%'},
    {k:'g1Use', label:'地面層主要用途', type:'text', ph:'例：店面'},
    {k:'upPct', label:'二層以上作為某用途的比例', type:'num', unit:'%'},
    {k:'upUse', label:'二層以上主要用途', type:'text', ph:'例：住家'},
    {k:'devPlan', label:'近期區域發展之重大設施與計畫', type:'one', opts:['無','有']},
    {k:'devPlan_x', label:'重大設施與計畫說明', type:'text', show:{k:'devPlan', v:'有'}}
  ]},
  {id:'market', step:'decide', title:'市場面分析', law:'公報摘要式第十一項之 3', land:true, items:[
    {k:'vacancy', label:'所在區域空屋率', type:'num', unit:'%'},
    {k:'supply', label:'區域供需情形', type:'one', opts:['供需平衡','供過於求','供不應求']},
    {k:'supplyDeg', label:'程度', type:'one', opts:['輕微','普通','嚴重'], show:{k:'supply', v:['供過於求','供不應求']}},
    {k:'clients', label:'消費客群', type:'one', opts:['在地客多','外來客多'], other:true},
    {k:'sellPeriod', label:'預計銷售期', type:'one', opts:['三個月內','三～六個月內','半年以上']},
    {k:'trend', label:'未來房價走勢', type:'one', opts:['平穩','上漲','下跌']},
    {k:'liquidity', label:'流通性', type:'one', opts:['良好','尚可','不佳']},
    {k:'bargain', label:'三個月內售出的議價空間', type:'num', unit:'%'}
  ]},
  {id:'reflect', step:'decide', title:'負面因素是否已反映於估值', law:'公報摘要式第十一項之 6、10', land:true, items:[
    {k:'nuisReflected', label:'嫌惡設施的影響已反映於估值', type:'one', opts:['是','否'], show:{k:'nuis', not:['無']}},
    {k:'innerReflected', label:'室內負面因素的影響已反映於估值', type:'one', opts:['是','否'], show:{k:'inner', v:'不佳'}}
  ]}
];
/* 面積明細（調資料，依建物謄本；㎡）與他項權利表：摘要式摘要表使用，不影響計算 */
var AREA_ROWS = [['main','主建物'],['attach','附屬建物'],['common1','公共設施（I）'],['common2','公共設施（II，含車位）'],['park','獨立產權車位'],['other','其他獨立產權']];
var LIEN_COLS = [['order','登記次序'],['kind','權利種類'],['start','設定起日'],['end','設定訖日（債權確定日期）'],['amount','擔保債權總金額'],['holder','設定之權利人'],['obligor','義務人'],['debtor','債務人']];
var RESIDENTIAL_KINDS = ['unit','house'];
/* 寫入用（會建立 c.chk）；讀取一律用 chkGet，只看畫面不能改到案件內容，否則多人協作時「看一下」也會變成一次修改 */
function chkOf(c){ if (!c.chk || typeof c.chk!=='object') c.chk={}; return c.chk; }
function chkGet(c){ return (c.chk && typeof c.chk==='object') ? c.chk : {}; }
function chkShown(c, it){
  if (!it.show) return true;
  var v=chkGet(c)[it.show.k];
  if (it.show.not) return Array.isArray(v) ? v.length>0 && v.some(function(x){ return it.show.not.indexOf(x)<0; }) : !!v && it.show.not.indexOf(v)<0;
  var want=[].concat(it.show.v);
  return Array.isArray(v) ? v.some(function(x){ return want.indexOf(x)>=0; }) : want.indexOf(v)>=0;
}
function surveyGroups(c, step){ var land=isLandKind(c.kind); return SURVEY.filter(function(g){ return g.step===step && (!land || g.land); }); }
/* 報告格式：auto 時，估價目的為抵押權設定、標的為區分所有建物或透天厝、未勾高價宅 → 摘要式 */
function reportFormat(c){
  var f=(c.report && c.report.format) || 'auto';
  if (f==='summary' || f==='narrative') return f;
  return (c.basic.purpose==='抵押權設定' && RESIDENTIAL_KINDS.indexOf(c.kind)>=0 && !chkGet(c).luxury) ? 'summary' : 'narrative';
}
/* 揭露文字（注意須知四）：給兩種報告共用 */
function surveyDisclosures(c){
  var x=chkGet(c), out=[];
  if (x.entered==='未能入內') out.push('本次因故未能進入勘估標的內部勘察'+(x.photoByClient?'，內部照片係由委託人提供':'')+'。');
  return out;
}
if (typeof module !== 'undefined' && module.exports) module.exports = {SURVEY:SURVEY, AREA_ROWS:AREA_ROWS, LIEN_COLS:LIEN_COLS, chkShown:chkShown, reportFormat:reportFormat, surveyDisclosures:surveyDisclosures};
