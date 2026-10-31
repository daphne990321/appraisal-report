/*DATA-START*/
/* ===== 官方代碼與選項（依內政部實價登錄開放資料核對，2026-10-10） ===== */
var COUNTIES = [
  ['A','臺北市','中正區 大同區 中山區 松山區 大安區 萬華區 信義區 士林區 北投區 內湖區 南港區 文山區'],
  ['F','新北市','板橋區 三重區 中和區 永和區 新莊區 新店區 樹林區 鶯歌區 三峽區 淡水區 汐止區 瑞芳區 土城區 蘆洲區 五股區 泰山區 林口區 深坑區 石碇區 坪林區 三芝區 石門區 八里區 平溪區 雙溪區 貢寮區 金山區 萬里區 烏來區'],
  ['H','桃園市','桃園區 中壢區 大溪區 楊梅區 蘆竹區 大園區 龜山區 八德區 龍潭區 平鎮區 新屋區 觀音區 復興區'],
  ['B','臺中市','中區 東區 南區 西區 北區 西屯區 南屯區 北屯區 豐原區 東勢區 大甲區 清水區 沙鹿區 梧棲區 后里區 神岡區 潭子區 大雅區 新社區 石岡區 外埔區 大安區 烏日區 大肚區 龍井區 霧峰區 太平區 大里區 和平區'],
  ['D','臺南市','新營區 鹽水區 白河區 柳營區 後壁區 東山區 麻豆區 下營區 六甲區 官田區 大內區 佳里區 學甲區 西港區 七股區 將軍區 北門區 新化區 善化區 新市區 安定區 山上區 玉井區 楠西區 南化區 左鎮區 仁德區 歸仁區 關廟區 龍崎區 永康區 東區 南區 北區 安南區 安平區 中西區'],
  ['E','高雄市','鹽埕區 鼓山區 左營區 楠梓區 三民區 新興區 前金區 苓雅區 前鎮區 旗津區 小港區 鳳山區 林園區 大寮區 大樹區 大社區 仁武區 鳥松區 岡山區 橋頭區 燕巢區 田寮區 阿蓮區 路竹區 湖內區 茄萣區 永安區 彌陀區 梓官區 旗山區 美濃區 六龜區 甲仙區 杉林區 內門區 茂林區 桃源區 那瑪夏區'],
  ['C','基隆市','中正區 七堵區 暖暖區 仁愛區 中山區 安樂區 信義區'],
  ['O','新竹市','東區 北區 香山區'],
  ['I','嘉義市','東區 西區'],
  ['J','新竹縣','竹北市 竹東鎮 新埔鎮 關西鎮 湖口鄉 新豐鄉 芎林鄉 橫山鄉 北埔鄉 寶山鄉 峨眉鄉 尖石鄉 五峰鄉'],
  ['K','苗栗縣','苗栗市 頭份市 苑裡鎮 通霄鎮 竹南鎮 後龍鎮 卓蘭鎮 大湖鄉 公館鄉 銅鑼鄉 南庄鄉 頭屋鄉 三義鄉 西湖鄉 造橋鄉 三灣鄉 獅潭鄉 泰安鄉'],
  ['N','彰化縣','彰化市 鹿港鎮 和美鎮 線西鄉 伸港鄉 福興鄉 秀水鄉 花壇鄉 芬園鄉 員林市 溪湖鎮 田中鎮 大村鄉 埔鹽鄉 埔心鄉 永靖鄉 社頭鄉 二水鄉 北斗鎮 二林鎮 田尾鄉 埤頭鄉 芳苑鄉 大城鄉 竹塘鄉 溪州鄉'],
  ['M','南投縣','南投市 埔里鎮 草屯鎮 竹山鎮 集集鎮 名間鄉 鹿谷鄉 中寮鄉 魚池鄉 國姓鄉 水里鄉 信義鄉 仁愛鄉'],
  ['P','雲林縣','斗六市 斗南鎮 虎尾鎮 西螺鎮 土庫鎮 北港鎮 古坑鄉 大埤鄉 莿桐鄉 林內鄉 二崙鄉 崙背鄉 麥寮鄉 東勢鄉 褒忠鄉 臺西鄉 元長鄉 四湖鄉 口湖鄉 水林鄉'],
  ['Q','嘉義縣','太保市 朴子市 布袋鎮 大林鎮 民雄鄉 溪口鄉 新港鄉 六腳鄉 東石鄉 義竹鄉 鹿草鄉 水上鄉 中埔鄉 竹崎鄉 梅山鄉 番路鄉 大埔鄉 阿里山鄉'],
  ['T','屏東縣','屏東市 潮州鎮 東港鎮 恆春鎮 萬丹鄉 長治鄉 麟洛鄉 九如鄉 里港鄉 鹽埔鄉 高樹鄉 萬巒鄉 內埔鄉 竹田鄉 新埤鄉 枋寮鄉 新園鄉 崁頂鄉 林邊鄉 南州鄉 佳冬鄉 琉球鄉 車城鄉 滿州鄉 枋山鄉 三地門鄉 霧臺鄉 瑪家鄉 泰武鄉 來義鄉 春日鄉 獅子鄉 牡丹鄉'],
  ['G','宜蘭縣','宜蘭市 羅東鎮 蘇澳鎮 頭城鎮 礁溪鄉 壯圍鄉 員山鄉 冬山鄉 五結鄉 三星鄉 大同鄉 南澳鄉'],
  ['U','花蓮縣','花蓮市 鳳林鎮 玉里鎮 新城鄉 吉安鄉 壽豐鄉 光復鄉 豐濱鄉 瑞穗鄉 富里鄉 秀林鄉 萬榮鄉 卓溪鄉'],
  ['V','臺東縣','臺東市 成功鎮 關山鎮 卑南鄉 鹿野鄉 池上鄉 東河鄉 長濱鄉 太麻里鄉 大武鄉 綠島鄉 海端鄉 延平鄉 金峰鄉 達仁鄉 蘭嶼鄉'],
  ['X','澎湖縣','馬公市 湖西鄉 白沙鄉 西嶼鄉 望安鄉 七美鄉'],
  ['W','金門縣','金城鎮 金湖鎮 金沙鎮 金寧鄉 烈嶼鄉 烏坵鄉'],
  ['Z','連江縣','南竿鄉 北竿鄉 莒光鄉 東引鄉']
];
function countyByName(nm){ return COUNTIES.find(function(c){ return c[1]===nm; }); }
function countyByCode(cd){ return COUNTIES.find(function(c){ return c[0]===String(cd||'').toUpperCase(); }); }
function districtsOf(nm){ var c=countyByName(nm); return c ? c[2].split(' ') : []; }
/* 建物型態：實價登錄資料中實際出現的值（索引供內嵌資料使用；6「套房」為歷史資料值，保留以利匯入） */
var BTYPES = ['住宅大樓(11層含以上有電梯)','華廈(10層含以下有電梯)','公寓(5樓含以下無電梯)','透天厝','店面(店鋪)','辦公商業大樓','套房(1房1廳1衛)','工廠','廠辦','倉庫','農舍','其他'];
var PARKTYPES = ['坡道平面','坡道機械','一樓平面','升降機械','升降平面','塔式車位','其他'];
var LEASETYPES = ['整棟(戶)出租','分層出租','獨立套房','分租套房','分租雅房'];
var PURPOSES = ['買賣參考','抵押權設定','資產價值證明','繼承、贈與','法院訴訟','都市更新權利變換','企業資產評價'];
var LEVELS = [[-3,'劣'],[-2,'較劣'],[-1,'稍劣'],[0,'相當'],[1,'稍優'],[2,'較優'],[3,'優']];
var SPECIALS = ['急買急賣或急出租急承租','期待因素影響之交易','受債權債務關係影響之交易','親友關係人間之交易','畸零地或有合併使用之交易','地上物處理有糾紛之交易','拍賣','公有土地標售、讓售','受迷信影響之交易','包含公共設施用地之交易','人為哄抬之交易','與法定用途不符之交易','其他特殊交易'];
var REGVARS = [['age','屋齡（年）'],['floor','樓層'],['area','建物面積（坪）'],['months','距價格日期月數'],['totalFloors','總樓層數']];
function zoneClass(z){ z=String(z||''); if (!z || z==='-') return ''; if (/住/.test(z)) return '住'; if (/商/.test(z)) return '商'; if (/工/.test(z)) return '工'; if (/農/.test(z)) return '農'; return '其他'; }
function normTai(s){ return String(s||'').replace(/台/g,'臺'); }
/* 內政部實價登錄開放資料：新竹縣（J）本期，買賣 212 筆含建物、租賃 64 筆；2026-10-10 下載 */
var RAW_J = `__RAW_J__`;
/* 網頁版：RAW_J 由建置時填入；Node：直接讀 data_j.txt */
if (RAW_J === '__RAW' + '_J__' && typeof require === 'function') RAW_J = require('fs').readFileSync(require('path').join(__dirname, 'data_j.txt'), 'utf8').replace(/\n$/, '');
var LVR_META = {county:'新竹縣', code:'J', issued:'2026-10-01 發布之本期資料', fetched:'2026-10-10'};
function rocYM5(s){ s=String(s||''); if (!/^\d{5}$/.test(s)) return ''; return (Number(s.slice(0,3))+1911)+'-'+s.slice(3,5); }
function ymDiffYears(a,b){ if (!a||!b) return ''; var p=a.split('-'), q=b.split('-'); return Math.max(0, Math.floor(((Number(q[0])*12+Number(q[1]))-(Number(p[0])*12+Number(p[1])))/12)); }
function noteToSpecial(note){ note=String(note||''); if (!note || note==='-') return '';
  var rules=[[/親友|特殊關係|員工|共有人|配偶|二等親|直系血親/,'親友關係人間之交易'],[/急買|急賣/,'急買急賣或急出租急承租'],[/債權|債務/,'受債權債務關係影響之交易'],[/畸零|合併/,'畸零地或有合併使用之交易'],[/拍賣|法拍/,'拍賣'],[/公有|標售|讓售/,'公有土地標售、讓售'],[/凶宅|非自然死亡|迷信/,'受迷信影響之交易'],[/公共設施/,'包含公共設施用地之交易'],[/哄抬/,'人為哄抬之交易'],[/含租約|讓渡|換約/,'其他特殊交易']];
  for (var i=0;i<rules.length;i++) if (rules[i][0].test(note)) return rules[i][1]; return ''; }
function isPresaleNote(note){ return /預售屋/.test(String(note||'')); }
function parseRawJ(){
  var sales=[], rents=[], mode='', k=0;
  RAW_J.split('\n').forEach(function(line){
    if (line.indexOf('###SALES')===0){ mode='s'; return; } if (line.indexOf('###RENTS')===0){ mode='r'; return; } if (line.indexOf('###')===0 || !line.trim()) return;
    var f=line.split('|').map(function(v){ return v==='-'?'':v; }); k++;
    if (mode==='s'){
      var date=rocYM5(f[3]), comp=rocYM5(f[6]), area=Number(f[7])||0, price=Number(f[8])*1000;
      sales.push({id:'J'+k, kind:'sale', src:'實價登錄', county:'新竹縣', district:normTai(f[0]), type:BTYPES[Number(f[1])]||'其他', zone:f[2], date:date, floorNum:Number(f[4])||0, totalFloors:Number(f[5])||0,
        completed:comp, age: comp?ymDiffYears(comp,date):'', areaPing:area, unitWan: area>0 ? Math.round(price/area/10000*100)/100 : 0, totalWan:Math.round(price/10000), park:f[9]==='1', note:f[10],
        special: noteToSpecial(f[10]), presale:isPresaleNote(f[10]), addr:'新竹縣'+normTai(f[0])+f[11], road:f[11], elevator:f[12]==='1', mgmt:f[13]==='1'});
    } else if (mode==='r'){
      var d2=rocYM5(f[3]), c2=rocYM5(f[6]), a2=Number(f[7])||0, rent=Number(f[8])||0;
      rents.push({id:'JR'+k, kind:'rent', src:'實價登錄', county:'新竹縣', district:normTai(f[0]), type:BTYPES[Number(f[1])]||'其他', zone:f[2], date:d2, floorNum:Number(f[4])||0, completed:c2, age:c2?ymDiffYears(c2,d2):'',
        areaPing:a2, rentTotal:rent, rentPerPing: a2>0 ? Math.round(rent/a2) : 0, furnished:f[9]==='1', lease:f[10], note:f[11], addr:'新竹縣'+normTai(f[0])+f[12], road:f[12]});
    }
  });
  return {sales:sales, rents:rents};
}
function ownCases(){
  return [
    {id:'OWN1', kind:'sale', src:'本所案例', county:'新竹縣', district:'竹北市', type:BTYPES[0], zone:'第二種住宅區', date:'2026-06', floorNum:11, totalFloors:15, completed:'2018-03', age:8, areaPing:39.2, unitWan:53.4, park:true, note:'', special:'', presale:false, addr:'新竹縣竹北市○○路（本所 115-0288 案）', road:'○○路', elevator:true, mgmt:true},
    {id:'OWN2', kind:'sale', src:'本所案例', county:'新竹縣', district:'竹北市', type:BTYPES[0], zone:'第二種住宅區', date:'2026-04', floorNum:9, totalFloors:14, completed:'2017-11', age:8, areaPing:36.8, unitWan:52.1, park:true, note:'', special:'', presale:false, addr:'新竹縣竹北市○○街（本所 115-0251 案）', road:'○○街', elevator:true, mgmt:true},
    {id:'OWN3', kind:'sale', src:'本所案例', county:'新竹縣', district:'竹北市', type:BTYPES[1], zone:'第二種住宅區', date:'2026-02', floorNum:6, totalFloors:9, completed:'2014-08', age:11, areaPing:33.5, unitWan:46.8, park:false, note:'', special:'', presale:false, addr:'新竹縣竹北市○○路（本所 115-0203 案）', road:'○○路', elevator:true, mgmt:true}
  ];
}

/* ===== 估價模型（事務所設定）預設值：示範值，正式使用前請依全聯會公告與本所經驗更新 ===== */
/* ===== 標的類型（估價師建立案件時選擇） ===== */
var KINDS = [
  {id:'unit', group:'建物', name:'區分所有建物', hint:'住宅大樓、華廈、公寓、套房', set:'bldg', areaLabel:'建物面積', methods:{comparison:true, income:true, cost:false, land:false}},
  {id:'house', group:'建物', name:'透天厝', hint:'房地合併，含基地', set:'bldg', areaLabel:'建物面積', methods:{comparison:true, income:false, cost:true, land:false}},
  {id:'land', group:'土地', name:'土地', hint:'住商素地、建地、危老或都更基地，可多筆', set:'land', areaLabel:'土地面積', methods:{comparison:true, income:false, cost:false, land:true}},
  {id:'industrial', group:'土地', name:'工業用地', hint:'甲乙丙種工業區、丁種建築用地', set:'ind', areaLabel:'土地面積', methods:{comparison:true, income:false, cost:false, land:false}},
  {id:'hotel', group:'商用', name:'旅館', hint:'營業中旅館、飯店，收益以客房營收計', set:'land', areaLabel:'建物面積', methods:{comparison:false, income:true, cost:true, land:false}},
  {id:'commercial', group:'商用', name:'商辦、商場', hint:'整棟辦公大樓、商場、店面', set:'bldg', areaLabel:'建物面積', methods:{comparison:true, income:true, cost:true, land:false}},
  {id:'factory', group:'商用', name:'廠房', hint:'工業區廠房（房地）', set:'ind', areaLabel:'建物面積', methods:{comparison:true, income:false, cost:true, land:false}}
];
function kindOf(id){ return KINDS.find(function(k){ return k.id===id; }) || KINDS[0]; }
function isLandKind(id){ return id==='land' || id==='industrial'; }
/* ===== 因素調整細項（依實際報告的大類與細項整理；各事務所可增刪） ===== */
var FACTOR_SETS = {
  bldg: {name:'建物（區分所有、透天、商辦）', region:[['r1','交通運輸','交通'],['r2','公共設施','生活機能'],['r3','公共設施','學區'],['r4','公共設施','公共設施'],['r5','自然條件','嫌惡設施'],['r6','發展潛力','發展趨勢',0]],
    indiv:[['i1','建物條件','樓層'],['i2','建物條件','景觀'],['i3','建物條件','面積'],['i4','建物條件','屋齡'],['i5','建物條件','採光通風'],['i6','建物條件','格局'],['i7','建物條件','屋況'],['i8','建物條件','管理'],['i9','建物條件','公設比',0],['i10','道路條件','臨路寬度',0],['i11','宗地條件','總價與單價關係',0]]},
  land: {name:'土地（住商、旅館基地）', region:[['L_r1','交通運輸','主要道路'],['L_r2','交通運輸','捷運、公車便利性'],['L_r3','交通運輸','鐵路、交流道接近程度'],['L_r4','自然條件','景觀'],['L_r5','自然條件','排水、地勢、災害影響'],['L_r6','公共設施','學校、市場'],['L_r7','公共設施','公園、服務性設施'],['L_r8','發展潛力','重大建設'],['L_r9','發展潛力','發展趨勢、生活圈']],
    indiv:[['L_i1','道路條件','道路寬度'],['L_i2','道路條件','道路鋪裝、種別'],['L_i3','接近條件','接近車站、學校、市場'],['L_i4','接近條件','接近公園、停車場、商圈'],['L_i5','週邊環境','地勢、日照'],['L_i6','週邊環境','嫌惡設施、鄰地使用'],['L_i7','行政條件','使用分區、建蔽率'],['L_i8','行政條件','容積率、禁限建'],['L_i9','宗地條件','面積'],['L_i10','宗地條件','面寬、深度'],['L_i11','宗地條件','形狀'],['L_i12','宗地條件','臨路情形'],['L_i13','宗地條件','總價與單價關係'],['L_i14','宗地條件','規劃可行性']]},
  ind: {name:'工業（工業用地、廠房）', region:[['G_r1','交通運輸','主要道路、交流道'],['G_r2','交通運輸','港口、鐵路'],['G_r3','公共設施','電力、產業用水'],['G_r4','公共設施','污廢水、廢棄物處理'],['G_r5','發展潛力','產業聚集、上下游'],['G_r6','發展潛力','擴廠可能性、勞工來源']],
    indiv:[['G_i1','道路條件','道路寬度'],['G_i2','道路條件','道路種別'],['G_i3','道路條件','貨車進出便利性'],['G_i4','宗地條件','面積'],['G_i5','宗地條件','形狀'],['G_i6','宗地條件','臨路面數'],['G_i7','宗地條件','土壤污染'],['G_i8','行政條件','使用變更、轉用'],['G_i9','建物條件','廠房結構、樓高',0]]}
};
function defaultIndicatorSet(key){
  var f=FACTOR_SETS[key], mk=function(g){ return function(x){ return {id:x[0], group:g, cat:x[1], name:x[2], step:1, stepAmt:0.5, on:x[3]===0?false:true}; }; };
  return f.region.map(mk('region')).concat(f.indiv.map(mk('indiv')));
}
function defaultIndicators(){ return defaultIndicatorSet('bldg'); }
function defaultIndicatorSets(){ return {bldg:defaultIndicatorSet('bldg'), land:defaultIndicatorSet('land'), ind:defaultIndicatorSet('ind')}; }
function defaultExp(){
  return [
    {id:'e1', name:'路沖', group:'indiv', pct:-3, on:true, sets:['bldg','land']},
    {id:'e2', name:'臨公園、綠地', group:'region', pct:2, on:true, sets:['bldg','land']},
    {id:'e3', name:'邊間', group:'indiv', pct:1.5, on:true, sets:['bldg']},
    {id:'e4', name:'頂樓', group:'indiv', pct:-2, on:true, sets:['bldg']},
    {id:'e5', name:'鄰近高壓電塔、變電所', group:'region', pct:-5, on:true, sets:['bldg','land','ind']},
    {id:'e6', name:'臨 15 公尺以上道路', group:'region', pct:2, on:true, sets:['bldg','land','ind']},
    {id:'e7', name:'無電梯四樓以上', group:'indiv', pct:-4, on:true, sets:['bldg']},
    {id:'e8', name:'雙面臨路（角地）', group:'indiv', pct:3, on:true, sets:['land','ind']},
    {id:'e9', name:'位法定山坡地', group:'indiv', pct:-5, on:true, sets:['land']},
    {id:'e10', name:'畸零地、難以單獨開發', group:'indiv', pct:-10, on:true, sets:['land']}
  ];
}
function defaultPurpose(conservative){
  var o={};
  PURPOSES.forEach(function(p){ o[p]={w:{comparison:80,income:20,cost:0,land:0}, capFloor:0, expMult:1}; });
  o['抵押權設定']={w:{comparison:70,income:30,cost:0,land:0}, capFloor:1.6, expMult:1.2};
  o['法院訴訟']={w:{comparison:70,income:30,cost:0,land:0}, capFloor:0, expMult:1};
  o['都市更新權利變換']={w:{comparison:60,income:0,cost:0,land:40}, capFloor:0, expMult:1};
  o['企業資產評價']={w:{comparison:50,income:50,cost:0,land:0}, capFloor:0, expMult:1};
  if (conservative) PURPOSES.forEach(function(p){ o[p].capFloor=Math.max(o[p].capFloor,1.6); o[p].expMult=Math.max(o[p].expMult,1.2); if (p==='買賣參考'||p==='繼承、贈與') o[p].w={comparison:70,income:30,cost:0,land:0}; });
  return o;
}
/* 依標的類型的方法權重：實際報告多為兩法各 50% */
function defaultKindWeights(){
  return {unit:null, house:{comparison:60,income:0,cost:40,land:0}, land:{comparison:50,income:0,cost:0,land:50}, industrial:{comparison:100,income:0,cost:0,land:0},
    hotel:{comparison:0,income:50,cost:50,land:0}, commercial:{comparison:40,income:40,cost:20,land:0}, factory:{comparison:50,income:0,cost:50,land:0}};
}
/* 敘述式報告書範本固定條文（依全聯會第二號公報範本格式整理；事務所可修改） */
function defaultTexts(){
  return {
    validMonths:6,
    stance:['本事務所以公正第三人立場進行客觀評估。','本事務所與委託人及受勘估單位僅為單純業務往來關係。','本事務所及本所估價師與委託人、不動產所有權人或交易雙方，並無國際會計準則第 24 號（IAS 24）所定之關係人或實質關係人之情事。','本報告書所載內容絕無虛偽或隱匿之情事，事實描述具真實確切性。','本報告書之分析意見及結論，係基於報告書所載假設及限制條件下成立，屬估價師中立之專業評論。','本事務所對勘估標的無現有或可預期之利益；對勘估標的之權利關係人亦無個人私利或偏見。','本事務所收取之報酬係專業勞務之正當報酬，不為不正當之競價，亦不刻意扭曲合理之估價結果。','本報告書內容遵循不動產估價師法及不動產估價技術規則，並依中華民國不動產估價師公會全國聯合會「敘述式估價報告書範本」格式製作。'],
    assumptions:['除報告書另有聲明外，勘估標的之所有權視為正常狀態且具市場性。','除報告書另有聲明外，評估結論未考慮抵押權或其他權利設定之影響。','報告書引用他人提供之資訊，經估價師盡力查證後認為確實可靠。','勘估標的之土地及其地上物視為一般正常情形，無隱藏或一般勘察無法發現之影響價值條件。','除報告書另有聲明外，勘估標的視為符合環境保護相關法規，未受限制。','勘估標的可能存在之危險因子（如土壤或地下水污染、石棉等）不在估價師勘察範圍內，本報告假設不存在此類影響價值之因素；如有需要，使用者應另聘專家分析。'],
    limits:['本報告書之持有人無出版本報告書之權利。','未經估價師書面同意，報告書全部或部分內容（尤其估價結論、估價師身分及事務所）不得經由廣告、公共關係、新聞或其他媒體公開。','評估結果僅適用於整體勘估標的；除報告書另有聲明，將總值按權利比例或其他方式劃分所得之結果均屬無效。','報告書之預測係基於當前市場條件、短期供需與穩定經濟基礎，將隨未來條件改變而變動。','評估結果僅供報告書所載估價目的參考，估價目的變更可能使估價金額改變。','評估結果係在報告書所載估價條件下形成，使用者應了解估價條件以免誤用。','評估結果僅具不動產價值參考性質，不必然為委託人或使用人之最後決定金額。','報告書使用者使用本報告書致違反個人資料保護法者，應自負法律責任。']
  };
}
function defaultModel(id, name, conservative){
  var sets = defaultIndicatorSets();
  return {id:id, name:name, updated:'2026-10-24',
    note: conservative ? '供抵押權設定等需保守估計之案件：選取期間較短、資本化率設下限、費用取高值。' : '本所一般案件使用。',
    settings:{dateMode:'auto', monthlyRate: conservative?0:0.3, weightMode:'manual', totalMode:'abs', lim15:15, lim30:30, gapLim:20, minComps:3, diffThreshold:20, unitDec:1, totalDec:0, unitDisplay:'wan'},
    indicators:sets.bldg, indicatorSets:sets, exp:defaultExp(),
    select:{sameCounty:true, sameDistrict:true, sameType:true, sameZone:true, months: conservative?12:24, ageTol: conservative?5:10, areaTolPct: conservative?30:40, floorTol:10, excludeSpecial:true, excludePresale:true, keyword:'', autoN:3, wDate:30, wAge:25, wArea:20, wFloor:15, wRoad:10},
    rentSelect:{sameCounty:true, sameDistrict:true, sameType:false, months:12, areaTolPct:60, onlyWhole:true, excludeFurnished:false},
    purpose:defaultPurpose(conservative), kindWeights:defaultKindWeights(),
    income:{vacMonths: conservative?1.5:1, cap: conservative?1.8:1.25},
    sources:{lvr:true, own:true},
    lda:{profit:20, design:2, adSell:6, mgmt:4.5, tax:1, ownRatio:50, ownRate:1.7, loanRate:3.27, freeFactor:1.3, saleFactor:1.75, firstFloorRatio:0.88, util1F:200, utilStep:1, baseFloor:4, pingPerCar:18},
    texts:defaultTexts(),
    cost:{unitCost:11.2, design:2.5, adSell:4, mgmt:2, tax:1, interest:2, profit:10, life:50, salvage:0,
      table:[{name:'加強磚造 1–3 層',unit:7.6},{name:'鋼筋混凝土造 4–5 層',unit:9.8},{name:'鋼筋混凝土造 6–10 層',unit:11.2},{name:'鋼筋混凝土造 11–15 層',unit:12.6},{name:'鋼骨鋼筋混凝土造 16–25 層',unit:15.8},{name:'鋼骨造 26 層以上',unit:19.5}]}
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = {COUNTIES:COUNTIES, countyByName:countyByName, countyByCode:countyByCode, districtsOf:districtsOf, BTYPES:BTYPES, PARKTYPES:PARKTYPES, LEASETYPES:LEASETYPES, PURPOSES:PURPOSES, LEVELS:LEVELS, SPECIALS:SPECIALS, REGVARS:REGVARS, zoneClass:zoneClass, normTai:normTai, LVR_META:LVR_META, rocYM5:rocYM5, ymDiffYears:ymDiffYears, noteToSpecial:noteToSpecial, isPresaleNote:isPresaleNote, parseRawJ:parseRawJ, ownCases:ownCases, KINDS:KINDS, kindOf:kindOf, isLandKind:isLandKind, FACTOR_SETS:FACTOR_SETS, defaultIndicatorSet:defaultIndicatorSet, defaultIndicators:defaultIndicators, defaultIndicatorSets:defaultIndicatorSets, defaultExp:defaultExp, defaultPurpose:defaultPurpose, defaultKindWeights:defaultKindWeights, defaultTexts:defaultTexts, defaultModel:defaultModel};
/*DATA-END*/
