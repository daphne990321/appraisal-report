/* 網頁介面：本機存檔、格式化與表單元件。只在瀏覽器使用，Node 不載入 */
var A; /* 整個 app 狀態；同時當作計算核心的 db 傳入（核心程式不讀取 A） */
var KEY = 'appraisal-generator-v5';
function load(){ try { var raw = localStorage.getItem(KEY); if (raw){ var o = JSON.parse(raw); if (o && o.v===5 && o.cases && o.cases.length && o.models && o.models.length){ o.ui={}; return o; } } } catch(e){} return fresh(); }
var saveT = null;
function save(){ clearTimeout(saveT); saveT = setTimeout(function(){ try { localStorage.setItem(KEY, JSON.stringify(A, function(k,v){ return (k==='ui' || k==='cloudLvr') ? undefined : v; })); } catch(e){} }, 300); if (typeof cloudScheduleSync === 'function') cloudScheduleSync(); }

/* ===== 案件工作流程（階段 A）：負責人、簽證估價師、步驟、狀態、期限 =====
   存在 A.caseMeta[案號]，不放進案件內容（案件檔匯出不含這些）；登入後與雲端案件的獨立欄位同步 */
var STAGES=[['intake','接案'],['docs','調資料'],['survey','現勘'],['comps','比較標的'],['calc','試算'],['decide','決定價格'],['deliver','簽名交付']];
var STATUSES=[['active','進行中'],['review','待確認'],['returned','退回修改'],['hold','暫停'],['cancelled','已取消']];
function metaOf(id){ A.caseMeta=A.caseMeta||{}; return A.caseMeta[id] || (A.caseMeta[id]={assignee:null, appraiser:null, stage:'intake', status:'active', due:''}); }
/* note：最近一次交接留言（階段 B）；noteBy、noteAt 由雲端填（本機模式只記時間） */
function metaPure(m){ return {assignee:m.assignee||null, appraiser:m.appraiser||null, stage:m.stage||'intake', status:m.status||'active', due:m.due||'', note:m.note||null}; }
function setMeta(id, patch){ var m=metaOf(id); Object.keys(patch).forEach(function(k){ m[k]=patch[k]; }); save(); }
/* 新案件的預設：負責人＝自己；自己是估價師時也當簽證估價師 */
function newCaseMeta(id){ var me=(typeof CLOUD_ME!=='undefined' && CLOUD_ME) ? CLOUD_ME : null; A.caseMeta=A.caseMeta||{};
  A.caseMeta[id]={assignee:me?me.userId:null, appraiser:me&&me.role==='appraiser'?me.userId:null, stage:'intake', status:'active', due:''}; }

/* ===== 工具 ===== */
function esc(x){ return String(x==null?'':x).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];}); }
function sgn(v,d){ v=Number(v)||0; return (v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(d===undefined?2:d); }
function cls(v){ return v>0?'pos':v<0?'neg':''; }
function cur(){ return A.cases.find(function(c){return c.id===A.caseId;}) || A.cases[0]; }
function modelById(id){ return findModel(A, id); }
function MOD(c){ return modelOf(A, c || cur()); }
/* 經營管理身分：案件內容唯讀（資料庫也會擋） */
function isManager(){ return typeof CLOUD_ME!=='undefined' && !!CLOUD_ME && CLOUD_ME.role==='manager'; }
function L(){ return cur().signed || isManager(); }
function D(){ return L() ? ' disabled' : ''; }
function ph(t){ return '<span class="ph">'+esc(t)+'</span>'; }
function isM(){ return window.matchMedia && window.matchMedia('(max-width:760px)').matches; }
function toast(m){ var t=document.getElementById('toast'); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(function(){t.hidden=true;},3200); }
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

/* ===== 現勘勾選題（階段 C）：依 core/survey.js 的題目定義產生控制項，答案存在 c.chk[key] =====
   one/many 用按鈕（手機好按；再點一次已選的 one＝取消），點擊由 data-act chkPick／chkToggle 處理；num、text、yn 沿用 F、CB */
function CHK(c, it){
  if (!chkShown(c, it)) return '';
  var x=c.chk||{}, p='c.chk.'+it.k, v=x[it.k], dis=D(), lab=esc(it.label), h;
  if (it.type==='num') return F(lab+(it.unit?' <span class="law">'+esc(it.unit)+'</span>':''), p, {num:true, step:'any', hint:it.hint?esc(it.hint):''});
  if (it.type==='text') return F(lab, p, {ph:it.ph, hint:it.hint?esc(it.hint):''});
  if (it.type==='yn') return '<div>'+CB(lab, p)+(it.hint?'<div class="hint">'+esc(it.hint)+'</div>':'')+'</div>';
  var many=it.type==='many', opts=it.opts.slice(), sel=many?(Array.isArray(v)?v:[]):[v];
  if (it.other) opts.push('其他');
  var short=!many && opts.length<=4 && opts.every(function(o){ return o.length<=4; });
  h='<div><div class="lbl">'+lab+'</div><div class="'+(many?'chkrow':'chkgrid'+(short?' s':''))+'" role="'+(many?'group':'radiogroup')+'" aria-label="'+lab+'">'
   +opts.map(function(o){ var on=sel.indexOf(o)>=0;
      return '<button type="button" class="chkopt'+(on?' on':'')+'" data-act="'+(many?'chkToggle':'chkPick')+'" data-k="'+esc(it.k)+'" data-v="'+esc(o)+'" role="'+(many?'checkbox':'radio')+'" aria-checked="'+on+'"'+dis+'>'+esc(o)+'</button>'; }).join('')+'</div>';
  if (it.other && sel.indexOf('其他')>=0) h+='<div style="margin-top:8px">'+F('其他說明', p+'_x', {ph:'請說明'})+'</div>';
  return h+(it.hint?'<div class="hint">'+esc(it.hint)+'</div>':'')+'</div>';
}
function surveyCard(c, g){
  return '<section class="card chkcard"><h2>'+esc(g.title)+' <span class="law">'+esc(g.law||'')+'</span></h2>'+g.items.map(function(it){ return CHK(c, it); }).join('')+'</section>';
}
function surveyCards(c, step){ return surveyGroups(c, step).map(function(g){ return surveyCard(c, g); }).join(''); }
