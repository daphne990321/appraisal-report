
/* ===== 案件總覽與工作流程列（階段 A）：只負責畫面，資料在 A.caseMeta（見 app1.js），同步在 cloud.js ===== */
function roleName(r){ return r==='appraiser'?'估價師':r==='manager'?'經營管理':'助理員'; }
function nameIn(list, id){ var x=list.find(function(y){ return y[0]===id; }); return x?x[1]:String(id||''); }
function stageName(id){ return nameIn(STAGES, id); }
function statusName(id){ return nameIn(STATUSES, id); }
function cMembers(){ return (typeof CLOUD_MEMBERS!=='undefined' && CLOUD_MEMBERS) ? CLOUD_MEMBERS : []; }
function cLogged(){ return typeof CLOUD_ME!=='undefined' && !!CLOUD_ME; }
function pad2(n){ return (n<10?'0':'')+n; }
function fmtDT(iso){ var d=new Date(iso); if (isNaN(d.getTime())) return String(iso||''); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+' '+pad2(d.getHours())+':'+pad2(d.getMinutes()); }
function fmtMD(iso){ var d=new Date(iso); if (isNaN(d.getTime())) return ''; return pad2(d.getMonth()+1)+'/'+pad2(d.getDate())+' '+pad2(d.getHours())+':'+pad2(d.getMinutes()); }
function noteCut(t, n){ t=String(t||''); return t.length>n ? t.slice(0,n)+'…' : t; }
function caseAddr(c){ var b=c.basic||{}; return b.addr || ((b.county||'')+(b.district||'')) || '新案件'; }
/* 期限與今天相差幾天（未設期限回傳 null）；正數＝還沒到，負數＝已逾期 */
function dueDays(m){ if (!m.due) return null; var a=Date.parse(m.due), b=Date.parse(today()); if (isNaN(a)||isNaN(b)) return null; return Math.round((a-b)/86400000); }
function dueText(m){ return m.due ? m.due.slice(5).replace('-','/') : ''; }
function caseOpen(c, m){ return !c.signed && m.status!=='cancelled'; }
function caseState(c, m){
  var d=dueDays(m);
  if (c.signed) return '<span class="chip ok">已交付</span>';
  if (m.status==='cancelled') return '<span class="chip mute">已取消</span>';
  if (m.status==='hold') return '<span class="chip mute">暫停</span>';
  if (d!==null && d<0) return '<span class="chip fail">逾期 '+(-d)+' 天</span>';
  if (m.status==='review') return '<span class="chip info">待確認</span>';
  if (m.status==='returned') return '<span class="chip warn">退回修改</span>';
  if (d!==null && d<=3) return '<span class="chip warn">'+(d===0?'今天到期':d+' 天內到期')+'</span>';
  return '<span class="chip mute">進行中</span>';
}
function caseFilters(){
  var me=cLogged()?CLOUD_ME.userId:null;
  var fs=[['open','進行中',function(c,m){ return caseOpen(c,m); }]];
  if (me){
    fs.push(['mine','我負責的',function(c,m){ return m.assignee===me && caseOpen(c,m); }]);
    fs.push(['review','待我確認',function(c,m){ return m.status==='review' && (m.appraiser===me || m.assignee===me); }]);
  }
  fs.push(['soon','3 天內到期',function(c,m){ var d=dueDays(m); return caseOpen(c,m) && d!==null && d>=0 && d<=3; }]);
  fs.push(['overdue','已逾期',function(c,m){ var d=dueDays(m); return caseOpen(c,m) && d!==null && d<0; }]);
  fs.push(['done','已交付',function(c){ return !!c.signed; }]);
  fs.push(['all','全部',function(){ return true; }]);
  return fs;
}
function caseDots(c, m){
  var si=Math.max(0, STAGES.findIndex(function(s){ return s[0]===m.stage; }));
  return '<span class="dots" aria-hidden="true">'+STAGES.map(function(s,i){ return '<i class="'+(c.signed||i<si?'done':i===si?'cur':'')+'"></i>'; }).join('')+'</span>';
}
function caseSort(a, b){
  var da=a.m.due, db=b.m.due;
  if (da && db){ if (da!==db) return da<db?-1:1; }
  else if (da) return -1; else if (db) return 1;
  return String(b.c.id).localeCompare(String(a.c.id));
}
function dueChip(c, m){
  if (!m.due) return '';
  var d=dueDays(m), k=(!c.signed && m.status!=='cancelled' && d!==null && d<0)?'fail':(!c.signed && m.status!=='cancelled' && d!==null && d<=3)?'warn':'mute';
  return '<span class="chip '+k+'">'+dueText(m)+'</span>';
}
function conflictsHere(){
  var office=cLogged()?CLOUD_ME.officeId:null, out=[];
  cloudConflicts().forEach(function(x,i){ if ((x.office||null)===(office||null)) out.push({i:i, x:x}); });
  return out;
}
function conflictRows(list){
  return list.map(function(e){ return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>'+esc(e.x.caseNo)+'</b><span class="law">'+esc(fmtDT(e.x.at))+'</span>'
    +'<button class="btn ghost xs" data-act="conflictRestore" data-i="'+e.i+'">另存為新案件</button><button class="btn ghost xs" data-act="conflictDrop" data-i="'+e.i+'">刪除備份</button></div>'; }).join('');
}
function caseBoxes(){
  var h='';
  if (!cLogged()) h+='<div class="box info">目前資料只存在這台電腦。登入雲端後可以指派負責人、多人一起處理案件。</div>';
  var cf=conflictsHere();
  if (cf.length) h+='<div class="box warn" style="flex-direction:column"><div>有 '+cf.length+' 份你未存成功的版本（別人先改過或刪除了該案件）</div>'+conflictRows(cf)+'</div>';
  return h;
}
function tabCases(){
  var logged=cLogged(), mob=isM(), fs=caseFilters(), me=logged?CLOUD_ME.userId:null;
  var f=A.listFilter||'open'; if (!fs.some(function(x){ return x[0]===f; })) f='open';
  var q=(A.ui.caseQ||'').toLowerCase(), fk=A.ui.fKind||'', fw=logged?(A.ui.fWho||''):'';
  var all=A.cases.map(function(c){ return {c:c, m:metaOf(c.id)}; });
  var fn=fs.find(function(x){ return x[0]===f; })[2];
  var rows=all.filter(function(r){
    if (!fn(r.c, r.m)) return false;
    if (fk && r.c.kind!==fk) return false;
    if (fw==='_none' ? r.m.assignee : fw && r.m.assignee!==fw) return false;
    if (q){ var b=r.c.basic||{}; if ([r.c.id, b.addr, b.client, (b.county||'')+(b.district||'')].join('\n').toLowerCase().indexOf(q)<0) return false; }
    return true; }).sort(caseSort);
  var mode=A.listMode==='board'?'board':'table';
  var kinds=[]; A.cases.forEach(function(c){ if (kinds.indexOf(c.kind)<0) kinds.push(c.kind); });
  var h='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h2 style="margin:0">案件總覽</h2><div style="display:flex;gap:6px;flex-wrap:wrap">'
    +(isManager()?'':'<button class="btn sm" data-act="newCase">＋ 新案件</button><button class="btn ghost sm" data-act="importCase">匯入案件檔</button>')+'</div></div>';
  h+=caseBoxes();
  h+='<div class="fchips" role="group" aria-label="篩選">'+fs.map(function(x){ var n=all.filter(function(r){ return x[2](r.c,r.m); }).length;
    return '<button class="fchip'+(f===x[0]?' on':'')+'" data-act="listFilter" data-v="'+x[0]+'">'+x[1]+' <span class="num">'+n+'</span></button>'; }).join('')+'</div>';
  h+='<div class="cfilters"><input id="caseSearch" class="inp" placeholder="搜尋案號、地址、委託人…" value="'+esc(A.ui.caseQ||'')+'" aria-label="搜尋案件">'
    +'<select class="inp" data-act-list-filter="kind" aria-label="類型"><option value="">類型：全部</option>'+kinds.map(function(k){ return '<option value="'+esc(k)+'"'+(k===fk?' selected':'')+'>'+esc(kindOf(k).name)+'</option>'; }).join('')+'</select>'
    +(logged?'<select class="inp" data-act-list-filter="who" aria-label="負責人"><option value="">負責人：全部</option>'+cMembers().map(function(u){ return '<option value="'+esc(u.userId)+'"'+(u.userId===fw?' selected':'')+'>'+esc(u.name)+'</option>'; }).join('')+'<option value="_none"'+(fw==='_none'?' selected':'')+'>未指派</option></select>':'')
    +(mob?'':'<div class="subtabs" role="group" aria-label="檢視"><button class="'+(mode==='table'?'on':'')+'" data-act="listMode" data-v="table">列表</button><button class="'+(mode==='board'?'on':'')+'" data-act="listMode" data-v="board">看板</button></div>')+'</div>';
  if (!rows.length) return h+'<div class="box info">沒有符合條件的案件。可以換一個篩選，或按「＋ 新案件」。</div>';
  if (mob){
    h+='<div class="ccards">'+rows.map(function(r){ var c=r.c, m=r.m, parts=[];
      if (logged) parts.push(esc(memberName(m.assignee)));
      parts.push(esc(stageName(m.stage))); parts.push(m.due?dueText(m):'無期限');
      return '<button class="ccard" data-act="openCase" data-v="'+esc(c.id)+'"><span class="r1"><b class="num">'+esc(c.id)+'</b>'+caseState(c,m)+(isDirty(c)?'<span class="chip warn">未儲存</span>':'')+'</span><span class="r2">'+esc(caseAddr(c))+'</span><span class="r3">'+parts.join('・')+'</span>'+(m.note?'<span class="r3">留言：'+esc(noteCut(m.note,40))+'</span>':'')+'</button>'; }).join('')+'</div>';
  } else if (mode==='board'){
    h+='<div class="tw"><div class="board">'+STAGES.map(function(s){ var col=rows.filter(function(r){ return r.m.stage===s[0] || (!STAGES.some(function(z){ return z[0]===r.m.stage; }) && s[0]==='intake'); });
      return '<div class="bcol"><div class="bh"><b>'+s[1]+'</b><span class="num law">'+col.length+'</span></div>'+col.map(function(r){ var c=r.c, m=r.m;
        return '<button class="bcard" data-act="openCase" data-v="'+esc(c.id)+'"><b class="num">'+esc(c.id)+'</b><span class="ba">'+esc(caseAddr(c))+'</span><span class="bm">'+(logged?'<span class="law">'+esc(memberName(m.assignee))+'</span>':'')+dueChip(c,m)+'</span></button>'; }).join('')+'</div>'; }).join('')+'</div></div>';
  } else {
    h+='<div class="tw"><table class="t clist" style="min-width:'+(logged?1180:860)+'px"><thead><tr><th>案號</th><th>勘估標的</th><th>類型</th><th>估價目的</th><th>委託人</th>'+(logged?'<th>負責人</th><th>簽證估價師</th>':'')+'<th>進度</th><th>期限</th><th>狀態</th>'+(logged?'<th>最後更新</th>':'')+'</tr></thead><tbody>'
      +rows.map(function(r){ var c=r.c, m=r.m, b=c.basic||{}, d=dueDays(m), od=caseOpen(c,m) && d!==null && d<0;
        return '<tr class="crow" data-act="openCase" data-v="'+esc(c.id)+'"><td class="num"><b>'+esc(c.id)+'</b></td><td>'+esc(caseAddr(c))+'</td><td>'+esc(kindOf(c.kind).name)+'</td><td>'+esc(b.purpose||'')+'</td><td>'+esc(b.client||'')+'</td>'
          +(logged?'<td>'+esc(memberName(m.assignee))+'</td><td>'+(m.appraiser?esc(memberName(m.appraiser)):'<span class="law">—</span>')+'</td>':'')
          +'<td style="white-space:nowrap">'+caseDots(c,m)+' <span class="law">'+esc(c.signed?'已交付':stageName(m.stage))+'</span></td>'
          +'<td class="num"'+(od?' style="color:var(--fail);font-weight:700"':'')+'>'+(m.due?dueText(m):'—')+'</td><td>'+caseState(c,m)+(isDirty(c)?' <span class="chip warn">未儲存</span>':'')+(m.note?' <span class="law" title="'+esc(m.note)+'">留言</span>':'')+'</td>'
          +(logged?'<td class="law">'+(m.updatedAt?esc(fmtDT(m.updatedAt).slice(0,10))+' '+esc(memberName(m.updatedBy)):'—')+'</td>':'')+'</tr>'; }).join('')
      +'</tbody></table></div>';
  }
  return h;
}

/* ===== 案件內頁：工作流程列 ===== */
function metaSel(key, label, opts, val, dis){
  return '<div><label class="lbl" for="meta_'+key+'">'+label+'</label><select class="inp" id="meta_'+key+'" data-meta="'+key+'"'+dis+'>'+opts.map(function(o){ return '<option value="'+esc(o[0])+'"'+(String(o[0])===String(val||'')?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('')+'</select></div>';
}
function metabar(c){
  var m=metaOf(c.id), dis=c.signed?' disabled':'', logged=cLogged(), h='<div class="metabar" role="group" aria-label="工作流程">';
  if (logged){
    var mem=cMembers();
    var ao=[['','未指派']].concat(mem.filter(function(u){ return u.active || u.userId===m.assignee; }).map(function(u){ return [u.userId, u.name]; }));
    if (m.assignee && !ao.some(function(o){ return o[0]===m.assignee; })) ao.push([m.assignee, memberName(m.assignee)]);
    var po=[['','未指定']].concat(mem.filter(function(u){ return u.role==='appraiser' && (u.active || u.userId===m.appraiser); }).map(function(u){ return [u.userId, u.name]; }));
    if (m.appraiser && !po.some(function(o){ return o[0]===m.appraiser; })) po.push([m.appraiser, memberName(m.appraiser)]);
    h+=metaSel('assignee','負責人',ao,m.assignee,dis)+metaSel('appraiser','簽證估價師',po,m.appraiser,dis);
  }
  h+=metaSel('stage','步驟',STAGES,m.stage,dis)+metaSel('status','狀態',STATUSES,m.status,dis)
    +'<div><label class="lbl" for="meta_due">期限</label><input class="inp" type="date" id="meta_due" data-meta="due" value="'+esc(m.due||'')+'"'+dis+'></div>'
    +(logged?'<div class="mb-hist"><button class="btn ghost sm" data-act="sheet" data-v="history">歷程</button></div>':'')+'</div>';
  var cf=conflictsHere().filter(function(e){ return e.x.caseNo===c.id; });
  if (cf.length) h+='<div class="box warn" style="flex-direction:column"><div>這件案子有 '+cf.length+' 份你未存成功的版本</div>'+conflictRows(cf)+'</div>';
  return h;
}

/* 案件內頁：最近一次交接留言（metabar 下方） */
function noteBox(c){
  var m=metaOf(c.id); if (!m.note) return '';
  var who=m.noteBy ? memberName(m.noteBy) : '本機', tm=m.noteAt ? fmtMD(m.noteAt) : '', st=m.status;
  return '<div class="box '+(st==='returned'?'warn':'info')+' notebox">'+(st==='returned'?'<b>退回修改</b>':st==='review'?'<b>待確認</b>':'')+'<span>'+esc(who)+(tm?' '+tm:'')+'：『'+esc(m.note)+'』</span></div>';
}

/* ===== 歷程 ===== */
function histChange(key, pair){
  var a=pair&&pair[0], b=pair&&pair[1];
  if (key==='data') return '修改案件內容';
  if (key==='assignee') return '負責人 '+(a?memberName(a):'未指派')+' → '+(b?memberName(b):'未指派');
  if (key==='appraiser') return '簽證估價師 '+(a?memberName(a):'未指定')+' → '+(b?memberName(b):'未指定');
  if (key==='stage') return '步驟 '+stageName(a)+' → '+stageName(b);
  if (key==='status') return '狀態 '+statusName(a)+' → '+statusName(b);
  if (key==='note') return '留言：『'+(typeof pair==='string' ? pair : (b||''))+'』'; /* 資料庫存的是整段文字，不是 [舊,新] */
  if (key==='due_date' || key==='due') return '期限 '+(a||'無')+' → '+(b||'無');
  return key;
}
function histText(r){
  var d=r.detail||{};
  if (r.action==='insert') return '建立案件';
  if (r.action==='sign') return '簽名交付';
  if (r.action==='delete') return '刪除案件';
  if (r.action==='update'){ var ch=d.changes||{}, ks=Object.keys(ch); return ks.length ? ks.map(function(k){ return histChange(k, ch[k]); }).join('；') : '更新'; }
  return r.action||'';
}
function historyBody(){
  var h=A.ui.hist;
  if (h===null || h===undefined) return '<div class="hint">載入中…</div>';
  if (!Array.isArray(h)) return '<div class="box warn">無法讀取歷程：'+esc(h.err||'')+'</div>';
  if (!h.length) return '<div class="hint">還沒有紀錄。</div>';
  return '<div class="hist">'+h.map(function(r){ return '<div class="hrow"><div class="law">'+esc(fmtDT(r.at))+'・'+esc(memberName(r.user_id))+'</div><div>'+esc(histText(r))+'</div></div>'; }).join('')+'</div>';
}
function openHistory(){
  A.ui.hist=null;
  cloudHistory(cur().id).then(function(rows){ A.ui.hist=rows; if (A.ui.sheet==='history') render(); },
    function(e){ A.ui.hist={err:(e&&e.message)||'發生錯誤'}; if (A.ui.sheet==='history') render(); });
}
function conflictRestore(i){
  var l=cloudConflicts(), e=l[i]; if (!e || !e.data) return;
  var d=JSON.parse(JSON.stringify(e.data)); d.id=nextId(); d.signed=false; d.signedAt=''; d.modelSnapshot=null;
  if (!A.models.some(function(m){ return m.id===d.modelId; })) d.modelId=A.models[0].id;
  A.cases.unshift(d); newCaseMeta(d.id); markSaved(d); cloudConflictDrop(i); save(); render(); toast('已另存為 '+d.id);
}
