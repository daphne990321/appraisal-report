/* 雲端登入（瀏覽器專用，Node 端 lib/engine.js、測試、MCP 不載入此檔）
   P2-3：Supabase 登入／登出與顯示目前登入的事務所。
   P2-4：登入後案件、估價模型、事務所設定改存雲端；登出時還原登入前的本機資料。 */
var CLOUD = {url:'https://ucqcwxawntocqkwlanbp.supabase.co', key:'sb_publishable_F-T_ZM4BtwiJ4ItTX2K0Vg_AM5bY7n8'};
var CLOUD_ME = null;
var CLOUD_CLIENT = null;
var CLOUD_BACKUP_KEY = 'appraisal-generator-v5-local-backup';
var CLOUD_STATUS = '';      /* '' | 'syncing' | 'ok' | 'error' */
var CLOUD_SYNCED = null;    /* 上次同步內容 {cases:{案號:JSON}, models:{代號:JSON}, settings:JSON}；null＝尚未完成讀取 */
var CLOUD_GEN = 0;          /* 每次登入／登出加 1，讓過期的非同步結果被丟棄 */
var CLOUD_LVR_CACHE = {}, CLOUD_LVR_KEY = '', CLOUD_LVR_LOADING = false, CLOUD_LVR_REQ = 0; /* P3-5：雲端實價登錄（只在本次瀏覽的記憶體） */
var cloudSyncT = null, cloudPushing = false, cloudPushAgain = false;
function loadSupabase(){
  if (CLOUD_CLIENT) return Promise.resolve(CLOUD_CLIENT);
  if (loadSupabase._p) return loadSupabase._p;
  loadSupabase._p = new Promise(function(res, rej){
    var fail=function(){ loadSupabase._p=null; rej(new Error('無法連線到雲端，請確認網路')); };
    var done=function(){ try { CLOUD_CLIENT = window.supabase.createClient(CLOUD.url, CLOUD.key); cloudWatchAuth(CLOUD_CLIENT); res(CLOUD_CLIENT); } catch(e){ fail(); } };
    if (window.supabase && window.supabase.createClient) { done(); return; }
    var s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'; s.onload=done; s.onerror=fail; document.head.appendChild(s);
  });
  return loadSupabase._p;
}
/* 從「重設密碼」信件連結回來時，supabase-js 預設（flowType 'implicit'、detectSessionInUrl true）會自動讀網址 #access_token=…&type=recovery 並發出 PASSWORD_RECOVERY */
function cloudWatchAuth(cl){
  cl.auth.onAuthStateChange(function(ev){
    if (ev==='PASSWORD_RECOVERY'){ A.ui.sheet='newpw'; render(); cloudFocus('newPw'); }
  });
}
function cloudFocus(id){ setTimeout(function(){ var el=document.getElementById(id); if (el) el.focus(); }, 0); }
/* ===== 記住我的 Email（只存 Email，不存密碼） ===== */
var CLOUD_EMAIL_KEY = 'appraisal-login-email';
function cloudSavedEmail(){ try { return localStorage.getItem(CLOUD_EMAIL_KEY) || ''; } catch(e){ return ''; } }
function cloudRememberEmail(email, on){
  try { if (on) localStorage.setItem(CLOUD_EMAIL_KEY, email); else localStorage.removeItem(CLOUD_EMAIL_KEY); } catch(e){}
}
/* 忘記密碼寄信結果 → 顯示訊息；成功與「找不到使用者」同一句，避免洩漏哪些 Email 有帳號 */
var CLOUD_RESET_OK = '如果這個 Email 有帳號，重設信已寄出，請到信箱點連結（可能在垃圾郵件匣）。';
function cloudResetMsg(err){
  if (!err) return CLOUD_RESET_OK;
  var m = (err && err.message) || String(err), code = (err && (err.code || err.status)) || '';
  if (/rate limit|429|over_email_send_rate_limit/i.test(m + ' ' + code)) return '寄信次數太多，請稍後再試';
  if (/user not found|user_not_found/i.test(m + ' ' + code)) return CLOUD_RESET_OK;
  return '寄送失敗：' + m;
}
function cloudForgot(){
  var em=document.getElementById('loginEmail');
  if (em) A.ui.loginEmail=em.value.trim();
  A.ui.forgotEmail=A.ui.loginEmail||''; A.ui.sheet='forgot'; render(); cloudFocus('forgotEmail');
}
function cloudSendReset(){
  if (A.ui.sending) return;
  var em=document.getElementById('forgotEmail'), email=em?em.value.trim():'';
  if (!email){ toast('請輸入 Email'); return; }
  A.ui.forgotEmail=email; A.ui.sending=true; render();
  var fin=function(msg){ A.ui.sending=false; render(); toast(msg); };
  loadSupabase().then(function(cl){
    return cl.auth.resetPasswordForEmail(email, {redirectTo: location.origin + location.pathname});
  }).then(function(r){ fin(cloudResetMsg(r && r.error)); }, function(err){ fin(cloudResetMsg(err)); });
}
function cloudSetPw(){
  if (A.ui.settingPw) return;
  var a=document.getElementById('newPw'), b=document.getElementById('newPw2');
  var pw=a?a.value:'', pw2=b?b.value:'';
  if (pw.length<8){ toast('新密碼至少 8 碼'); return; }
  if (pw!==pw2){ toast('兩次輸入的密碼不一致'); return; }
  A.ui.settingPw=true; render();
  loadSupabase().then(function(cl){
    return cl.auth.updateUser({password:pw}).then(function(r){
      if (r && r.error) throw new Error(r.error.message);
      try { history.replaceState(null, '', location.pathname); } catch(e){}
      A.ui.settingPw=false; A.ui.sheet=null; render();
      return cloudRefresh().then(function(){ toast('密碼已更新，已登入'); });
    });
  }).catch(function(err){ A.ui.settingPw=false; render(); toast('更新失敗：'+((err&&err.message)||err)); });
}
function cloudRefresh(){
  return loadSupabase().then(function(cl){
    return cl.auth.getSession().then(function(r){
      var ses = r && r.data && r.data.session;
      if (!ses){ CLOUD_ME = null; render(); return; }
      return cl.from('members').select('user_id, role, display_name, office_id, offices(name)').eq('user_id', ses.user.id).maybeSingle().then(function(q){
        var m = q && q.data;
        if (!m){ CLOUD_ME = null; return cl.auth.signOut().then(function(){}, function(){}).then(function(){ render(); toast('此帳號尚未加入任何事務所，請聯絡管理者'); }); }
        var off = Array.isArray(m.offices) ? m.offices[0] : m.offices;
        CLOUD_ME = {userId:m.user_id, email:ses.user.email, role:m.role, displayName:m.display_name, officeId:m.office_id, officeName:(off&&off.name)||''};
        if (!('cloudPrevRole' in A.ui)) A.ui.cloudPrevRole = A.role; /* 登出時還原本機身分 */
        A.role = CLOUD_ME.role;
        render();
        return cloudPull();
      });
    });
  });
}
function cloudSignIn(email, password){
  return loadSupabase().then(function(cl){
    return cl.auth.signInWithPassword({email:email, password:password}).then(function(r){
      if (r.error) throw new Error(/Invalid login credentials/i.test(r.error.message) ? '帳號或密碼錯誤' : '登入失敗：'+r.error.message);
      return cloudRefresh();
    });
  }).then(function(){
    if (CLOUD_ME){ A.ui.sheet=null; render(); toast('已登入：'+CLOUD_ME.officeName); }
  });
}
/* 登入對話框的送出：讀欄位、顯示「登入中…」、錯誤以 toast 顯示 */
function cloudDoLogin(){
  if (A.ui.logging) return;
  var em=document.getElementById('loginEmail'), pw=document.getElementById('loginPw');
  var email=em?em.value.trim():'', password=pw?pw.value:'';
  if (!email || !password){ toast('請輸入 Email 與密碼'); return; }
  var rm=document.getElementById('loginRemember'); A.ui.loginRemember = rm ? rm.checked : true;
  A.ui.loginEmail=email; A.ui.logging=true; render();
  cloudSignIn(email, password).then(function(){ if (CLOUD_ME) cloudRememberEmail(email, A.ui.loginRemember); A.ui.logging=false; if (A.ui.sheet==='login') render(); }, function(err){ A.ui.logging=false; render(); toast((err&&err.message)||'登入失敗'); });
}
function cloudSignOut(){
  var done=function(){
    CLOUD_GEN++; clearTimeout(cloudSyncT); clearTimeout(saveT); /* 避免舊資料晚一步寫回 localStorage */
    CLOUD_ME=null; CLOUD_SYNCED=null; CLOUD_STATUS=''; cloudPushAgain=false;
    CLOUD_LVR_CACHE={}; CLOUD_LVR_KEY=''; CLOUD_LVR_LOADING=false; CLOUD_LVR_REQ++; CLOUD_LVR_LAST=null; delete A.cloudLvr; /* 登出：清掉雲端實價登錄與快取 */
    CLOUD_MEMBERS=[]; CLOUD_VER={}; /* 階段 A：成員名單與版本號 */
    var bak=null;
    try { bak=localStorage.getItem(CLOUD_BACKUP_KEY); if (bak!==null){ localStorage.setItem(KEY, bak); localStorage.removeItem(CLOUD_BACKUP_KEY); } } catch(e){}
    A = (bak!==null) ? load() : fresh();
    A.ui={};
    render(); toast('已登出，這台電腦已改回登入前的本機資料');
  };
  loadSupabase().then(function(cl){ return cl.auth.signOut(); }).then(done, function(err){ toast((err&&err.message)||'登出失敗'); });
}
/* ===== 雲端同步（P2-4） ===== */
function cloudStatusText(){ return CLOUD_LVR_LOADING && CLOUD_STATUS!=='syncing' && CLOUD_STATUS!=='error' ? '實價登錄載入中…' : CLOUD_STATUS==='syncing' ? '同步中…' : CLOUD_STATUS==='ok' ? '已同步' : CLOUD_STATUS==='error' ? '同步失敗' : ''; }
/* 只改狀態文字，不整頁 render()（避免輸入中游標跳掉）；桌面用 #cloudStatus，手機選單用 .cloud-st */
function cloudSetStatus(st){
  CLOUD_STATUS=st;
  try {
    var els=document.querySelectorAll('.cloud-st');
    for (var i=0;i<els.length;i++){ els[i].textContent=cloudStatusText(); els[i].style.color = st==='error' ? 'var(--fail)' : ''; els[i].style.fontWeight = st==='error' ? '700' : ''; }
  } catch(e){}
}
/* ===== 多人協作（階段 A）=====
   案件內容（data）存檔時比對版本號 version：雲端版本 ≠ 我拿到的版本，代表別人改過 → 載入最新版、我的修改另存備份。
   工作流程欄位（負責人、簽證估價師、步驟、狀態、期限）獨立存，不檢查版本（類似 JIRA，最後一次修改為準），且不會動到案件內容。
   新案件用 insert（不覆蓋）；案號被別人先用走時自動換號。每 60 秒與切回視窗時，自動載入別人的修改。 */
var CLOUD_MEMBERS = [];   /* 本事務所成員 [{userId, name, role, active}] */
var CLOUD_VER = {};       /* 案號 → 雲端版本號 */
var CLOUD_CONFLICT_KEY = 'appraisal-conflict-backup';
var CLOUD_CASE_COLS = 'case_no, signed, data, assignee, appraiser, stage, status, due_date, handoff_note, handoff_by, handoff_at, version, updated_at, updated_by';
var CLOUD_META_COLS = 'case_no, signed, assignee, appraiser, stage, status, due_date, handoff_note, handoff_by, handoff_at, version, updated_at, updated_by';
function cloudCaseRow(c){ return {office_id:CLOUD_ME.officeId, case_no:c.id, kind:c.kind||null, signed:!!c.signed, data:c}; }
function cloudMetaRow(id){ var m=metaPure(metaOf(id)); return {assignee:m.assignee, appraiser:m.appraiser, stage:m.stage, status:m.status, due_date:m.due||null, handoff_note:m.note}; }
function cloudMetaFromRow(row){ return {assignee:row.assignee||null, appraiser:row.appraiser||null, stage:row.stage||'intake', status:row.status||'active', due:row.due_date||'', note:row.handoff_note||null, noteBy:row.handoff_by||null, noteAt:row.handoff_at||'', updatedAt:row.updated_at||'', updatedBy:row.updated_by||null}; }
function cloudModelRow(m){ return {office_id:CLOUD_ME.officeId, model_key:m.id, name:m.name||m.id, data:m}; }
function cloudSettingsOf(){ return {own:A.own, imported:A.imported, hideBuiltin:!!A.hideBuiltin}; }
function cloudSnapshot(){
  var o={cases:{}, meta:{}, models:{}, settings:JSON.stringify(cloudSettingsOf())};
  A.cases.forEach(function(c){ var sv=(A.saved||{})[c.id]; o.cases[c.id]=sv!==undefined ? sv : JSON.stringify(c); o.meta[c.id]=JSON.stringify(metaPure(metaOf(c.id))); }); /* 只送「已確認儲存」的內容 */
  A.models.forEach(function(m){ o.models[m.id]=JSON.stringify(m); });
  return o;
}
function memberName(uid){ if (!uid) return '未指派'; var m=CLOUD_MEMBERS.find(function(x){ return x.userId===uid; }); return m ? m.name : (CLOUD_ME && uid===CLOUD_ME.userId ? (CLOUD_ME.displayName||CLOUD_ME.email) : '已移除的成員'); }
function cloudMembersLoad(cl, office){
  return cl.from('members').select('user_id, display_name, role, active').eq('office_id', office).then(function(r){
    cloudChk(r); CLOUD_MEMBERS=(r.data||[]).map(function(m){ return {userId:m.user_id, name:m.display_name||'（未命名）', role:m.role, active:m.active!==false}; })
      .sort(function(a,b){ return a.name<b.name?-1:a.name>b.name?1:0; });
  });
}
/* 把雲端的一列案件套進畫面與「已同步」快照 */
function cloudApplyRow(row){
  var no=row.case_no, c=row.data, S=CLOUD_SYNCED; c.signed=!!row.signed;
  var i=A.cases.findIndex(function(x){ return x.id===no; });
  if (i>=0) A.cases[i]=c; else A.cases.push(c);
  A.caseMeta=A.caseMeta||{}; A.caseMeta[no]=cloudMetaFromRow(row);
  CLOUD_VER[no]=row.version;
  A.saved=A.saved||{}; A.savedVer=A.savedVer||{}; A.savedAt=A.savedAt||{};
  A.saved[no]=JSON.stringify(c); A.savedVer[no]=row.version; A.savedAt[no]=row.updated_at||A.savedAt[no]||'';
  if (S){ S.cases[no]=A.saved[no]; S.meta[no]=JSON.stringify(metaPure(A.caseMeta[no])); }
}
function cloudRemoveLocal(no){
  if (A.cases.length<=1) return false;
  A.cases=A.cases.filter(function(x){ return x.id!==no; });
  if (A.caseMeta) delete A.caseMeta[no];
  if (A.saved) delete A.saved[no]; if (A.savedVer) delete A.savedVer[no];
  if (A.caseId===no) A.caseId=A.cases[0].id;
  if (CLOUD_SYNCED){ delete CLOUD_SYNCED.cases[no]; delete CLOUD_SYNCED.meta[no]; }
  delete CLOUD_VER[no];
  return true;
}
/* 衝突備份：存檔被拒時，把自己的版本留在這台電腦（最多 20 份） */
function cloudConflicts(){ try { var a=JSON.parse(localStorage.getItem(CLOUD_CONFLICT_KEY)||'[]'); return Array.isArray(a)?a:[]; } catch(e){ return []; } }
function cloudConflictSave(list){ try { localStorage.setItem(CLOUD_CONFLICT_KEY, JSON.stringify(list.slice(-20))); } catch(e){} }
function cloudConflictAdd(c){ var l=cloudConflicts(); l.push({at:new Date().toISOString(), caseNo:c.id, office:CLOUD_ME&&CLOUD_ME.officeId, data:c}); cloudConflictSave(l); }
function cloudConflictDrop(i){ var l=cloudConflicts(); l.splice(i,1); cloudConflictSave(l); }
function cloudBackupLocal(){
  try { if (localStorage.getItem(CLOUD_BACKUP_KEY)===null){ var raw=localStorage.getItem(KEY); if (raw!==null) localStorage.setItem(CLOUD_BACKUP_KEY, raw); } } catch(e){}
}
function cloudErrMsg(e){ return (e && e.message) || String(e || '未知錯誤'); }
function cloudChk(r){ if (r && r.error) throw new Error(cloudErrMsg(r.error)); return r; }
function cloudPull(){
  var gen=++CLOUD_GEN, office=CLOUD_ME.officeId, cl=CLOUD_CLIENT;
  CLOUD_SYNCED=null; clearTimeout(cloudSyncT); cloudSetStatus('syncing');
  return Promise.all([
    cl.from('cases').select(CLOUD_CASE_COLS).eq('office_id', office),
    cl.from('models').select('model_key, data').eq('office_id', office),
    cl.from('office_settings').select('data').eq('office_id', office).maybeSingle(),
    cloudMembersLoad(cl, office)
  ]).then(function(rs){
    if (gen!==CLOUD_GEN) return;
    var rc=cloudChk(rs[0]), rm=cloudChk(rs[1]), rst=cloudChk(rs[2]);
    var cs=(rc.data||[]).slice().sort(function(a,b){ return a.case_no<b.case_no?-1:a.case_no>b.case_no?1:0; });
    var ms=(rm.data||[]).slice().sort(function(a,b){ return a.model_key<b.model_key?-1:a.model_key>b.model_key?1:0; });
    var st=rst.data && rst.data.data;
    cloudBackupLocal();
    if (!cs.length && !ms.length){
      /* 第一次使用：把這台電腦的資料整批上傳，再重新讀一次（取得版本號與負責人） */
      var ups=[
        cl.from('cases').upsert(A.cases.map(function(c){ return Object.assign(cloudCaseRow(c), cloudMetaRow(c.id)); }), {onConflict:'office_id,case_no'}),
        cl.from('models').upsert(A.models.map(cloudModelRow), {onConflict:'office_id,model_key'}),
        cl.from('office_settings').upsert({office_id:office, data:cloudSettingsOf()}, {onConflict:'office_id'})
      ];
      var n=A.cases.length;
      return Promise.all(ups).then(function(us){
        us.forEach(cloudChk);
        if (gen!==CLOUD_GEN) return;
        toast('已把這台電腦的 '+n+' 件案件上傳到雲端');
        return cloudPull();
      });
    }
    /* 雲端只有其中一種資料時，把本機缺的那一種補傳上去，再重新讀一次 */
    var ups2=[];
    if (!ms.length) ups2.push(cl.from('models').upsert(A.models.map(cloudModelRow), {onConflict:'office_id,model_key'}));
    if (!cs.length) ups2.push(cl.from('cases').upsert(A.cases.map(function(c){ return Object.assign(cloudCaseRow(c), cloudMetaRow(c.id)); }), {onConflict:'office_id,case_no'}));
    if (ups2.length) return Promise.all(ups2).then(function(us){ us.forEach(cloudChk); if (gen!==CLOUD_GEN) return; return cloudPull(); });
    /* 未儲存的修改：雲端版本沒變就接回來；雲端已被別人改過就另存備份 */
    var drafts={}; A.cases.forEach(function(c){ var sv=(A.savedVer||{})[c.id]; if (sv!==undefined && isDirty(c)) drafts[c.id]={c:c, ver:sv}; });
    A.cases=[]; A.caseMeta={}; CLOUD_VER={}; A.saved={}; A.savedVer={}; A.savedAt={};
    cs.forEach(function(r){ var c=r.data; c.signed=!!r.signed; A.cases.push(c); A.caseMeta[r.case_no]=cloudMetaFromRow(r); CLOUD_VER[r.case_no]=r.version;
      A.saved[r.case_no]=JSON.stringify(c); A.savedVer[r.case_no]=r.version; A.savedAt[r.case_no]=r.updated_at||''; });
    var lost=0;
    Object.keys(drafts).forEach(function(no){ var d=drafts[no], i=A.cases.findIndex(function(x){ return x.id===no; });
      if (i>=0 && CLOUD_VER[no]===d.ver && !A.cases[i].signed) A.cases[i]=d.c; else { cloudConflictAdd(d.c); lost++; } });
    if (lost) setTimeout(function(){ toast(lost+' 件案件的未儲存修改，因雲端已被別人更新而另存備份，可在案件總覽找回'); }, 600);
    A.models=ms.map(function(r){ return r.data; });
    if (st){
      if (st.own) A.own=st.own;
      if (st.imported) A.imported=st.imported;
      if ('hideBuiltin' in st) A.hideBuiltin=!!st.hideBuiltin;
    }
    if (!A.cases.some(function(c){ return c.id===A.caseId; })) A.caseId=A.cases[0].id;
    if (!A.models.some(function(m){ return m.id===A.pModel; })) A.pModel=A.models[0].id;
    CLOUD_SYNCED=cloudSnapshot(); cloudSetStatus('ok'); save(); render(); cloudPollStart();
  }).catch(function(e){
    if (gen!==CLOUD_GEN) return;
    cloudSetStatus('error'); toast('雲端讀取失敗：'+cloudErrMsg(e));
  });
}
function cloudScheduleSync(){
  if (!CLOUD_ME || !CLOUD_SYNCED) return;
  clearTimeout(cloudSyncT); cloudSyncT=setTimeout(cloudPush, 2000);
}
/* 下一個沒人用的案號（本機與雲端都要避開） */
function cloudFreeNo(serverNos){
  var m=0; A.cases.map(function(c){ return c.id; }).concat(serverNos).forEach(function(id){ var x=parseInt(String(id).split('-')[1],10); if (x>m) m=x; });
  return '115-'+String(m+1).padStart(4,'0');
}
function cloudRenameCase(oldId, newId){
  var c=A.cases.find(function(x){ return x.id===oldId; }); if (!c) return;
  var wasDirty=isDirty(c), sv=(A.saved||{})[oldId];
  c.id=newId; A.caseMeta=A.caseMeta||{}; A.saved=A.saved||{};
  if (sv!==undefined){ var o=JSON.parse(sv); o.id=newId; A.saved[newId]=wasDirty?JSON.stringify(o):JSON.stringify(c); delete A.saved[oldId]; }
  if (A.caseMeta[oldId]){ A.caseMeta[newId]=A.caseMeta[oldId]; delete A.caseMeta[oldId]; }
  if (A.caseId===oldId) A.caseId=newId;
}
function cloudPush(){
  if (!CLOUD_ME || !CLOUD_SYNCED) return Promise.resolve();
  if (cloudPushing){ cloudPushAgain=true; return Promise.resolve(); }
  var gen=CLOUD_GEN, cl=CLOUD_CLIENT, office=CLOUD_ME.officeId, S=CLOUD_SYNCED, now=cloudSnapshot();
  var wasSigned=function(js){ try { return !!JSON.parse(js).signed; } catch(e){ return false; } };
  var jobs=[]; /* 每項是一個回傳 Promise 的函式；自己處理結果並更新快照 S */
  var q=function(){ return cl.from('cases'); };
  A.cases.forEach(function(c){
    var id=c.id, js=now.cases[id], mj=now.meta[id], known=(id in S.cases);
    var dataChanged=S.cases[id]!==js, metaChanged=S.meta[id]!==mj;
    if (!dataChanged && !metaChanged) return;
    if (known && wasSigned(S.cases[id])) return; /* 已簽名：資料庫不允許改 */
    if (!known){
      /* 新案件：insert，不覆蓋別人的案件；案號被用走就換號，下一輪再存 */
      jobs.push(function(){
        return q().insert(Object.assign(cloudCaseRow(JSON.parse(js)), cloudMetaRow(id))).select('version, assignee').then(function(r){
          if (r.error && (r.error.code==='23505' || /duplicate key/i.test(r.error.message||''))){
            return q().select('case_no').eq('office_id', office).then(function(r2){
              cloudChk(r2); if (gen!==CLOUD_GEN) return;
              var nid=cloudFreeNo((r2.data||[]).map(function(x){ return x.case_no; }));
              cloudRenameCase(id, nid); cloudPushAgain=true; save(); render();
              toast('案號 '+id+' 已被其他人使用，這件改為 '+nid);
            });
          }
          cloudChk(r); if (gen!==CLOUD_GEN) return;
          var row=r.data && r.data[0]; CLOUD_VER[id]=row ? row.version : 1; A.savedVer=A.savedVer||{}; A.savedVer[id]=CLOUD_VER[id];
          if (row && row.assignee && !metaOf(id).assignee){ metaOf(id).assignee=row.assignee; mj=JSON.stringify(metaPure(metaOf(id))); }
          S.cases[id]=js; S.meta[id]=mj;
        });
      });
      return;
    }
    /* 先存工作流程欄位（簽名後就不能改，所以排在案件內容前面） */
    if (metaChanged) jobs.push(function(){
      return q().update(cloudMetaRow(id)).eq('office_id', office).eq('case_no', id).select('case_no').then(function(r){
        cloudChk(r); if (gen!==CLOUD_GEN) return; S.meta[id]=mj;
      });
    });
    if (dataChanged) jobs.push(function(){
      var obj=JSON.parse(js);
      return q().update({kind:obj.kind||null, signed:!!obj.signed, data:obj}).eq('office_id', office).eq('case_no', id).eq('version', CLOUD_VER[id]).select('version').then(function(r){
        cloudChk(r); if (gen!==CLOUD_GEN) return;
        if (r.data && r.data.length){ CLOUD_VER[id]=r.data[0].version; A.savedVer=A.savedVer||{}; A.savedVer[id]=CLOUD_VER[id]; S.cases[id]=js; return; }
        return cloudConflict(id, obj);
      });
    });
  });
  Object.keys(S.cases).forEach(function(id){
    if (id in now.cases || wasSigned(S.cases[id])) return;
    jobs.push(function(){
      return q().delete().eq('office_id', office).eq('case_no', id).eq('version', CLOUD_VER[id]).select('case_no').then(function(r){
        cloudChk(r); if (gen!==CLOUD_GEN) return;
        delete S.cases[id]; delete S.meta[id];
        if (!(r.data && r.data.length)){ delete CLOUD_VER[id]; toast('案件 '+id+' 在你刪除前已被別人修改，沒有刪除，已重新載入'); setTimeout(cloudPoll, 0); }
        else delete CLOUD_VER[id];
      });
    });
  });
  A.models.forEach(function(m){
    var js=now.models[m.id];
    if (S.models[m.id]===js) return;
    jobs.push(function(){ return cl.from('models').upsert(cloudModelRow(JSON.parse(js)), {onConflict:'office_id,model_key'}).then(function(r){ cloudChk(r); if (gen===CLOUD_GEN) S.models[m.id]=js; }); });
  });
  Object.keys(S.models).forEach(function(id){
    if (id in now.models) return;
    jobs.push(function(){ return cl.from('models').delete().eq('office_id', office).eq('model_key', id).then(function(r){ cloudChk(r); if (gen===CLOUD_GEN) delete S.models[id]; }); });
  });
  if (S.settings!==now.settings) jobs.push(function(){ return cl.from('office_settings').upsert({office_id:office, data:JSON.parse(now.settings)}, {onConflict:'office_id'}).then(function(r){ cloudChk(r); if (gen===CLOUD_GEN) S.settings=now.settings; }); });
  if (!jobs.length) return Promise.resolve();
  cloudPushing=true; cloudSetStatus('syncing');
  var firstErr=null, chain=Promise.resolve();
  jobs.forEach(function(j){ chain=chain.then(j).catch(function(e){ if (!firstErr) firstErr=e; }); });
  return chain.then(function(){
    cloudPushing=false;
    if (gen!==CLOUD_GEN) return;
    if (firstErr){ cloudSetStatus('error'); toast('雲端儲存失敗：'+cloudErrMsg(firstErr)); }
    else cloudSetStatus('ok');
    if (cloudPushAgain){ cloudPushAgain=false; if (!firstErr) cloudScheduleSync(); }
  });
}
/* 存檔被拒（別人先改過或已刪除）：我的版本存成備份，畫面改成雲端最新版 */
function cloudConflict(id, mine){
  var gen=CLOUD_GEN, office=CLOUD_ME.officeId;
  var work=A.cases.find(function(x){ return x.id===id; }); cloudConflictAdd(work || mine);
  return CLOUD_CLIENT.from('cases').select(CLOUD_CASE_COLS).eq('office_id', office).eq('case_no', id).maybeSingle().then(function(r){
    cloudChk(r); if (gen!==CLOUD_GEN) return;
    var row=r.data;
    if (!row){ cloudRemoveLocal(id); toast('案件 '+id+' 已被別人刪除；你的版本已備份，可在案件總覽的「未存成功的版本」找回'); }
    else { cloudApplyRow(row); toast('案件 '+id+' 已被 '+memberName(row.updated_by)+' 修改，已載入最新版本；你這次的修改已另外備份'); }
    save(); render();
  });
}
/* ===== 自動載入別人的修改：每 60 秒、切回視窗時 ===== */
var CLOUD_POLL_T = null, CLOUD_POLLING = false;
function cloudPollStart(){
  if (CLOUD_POLL_T) return;
  CLOUD_POLL_T = setInterval(cloudPoll, 60000);
  window.addEventListener('focus', function(){ cloudPoll(); });
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) cloudPoll(); });
}
function cloudPoll(){
  if (!CLOUD_ME || !CLOUD_SYNCED || cloudPushing || CLOUD_POLLING || document.hidden) return;
  var gen=CLOUD_GEN, cl=CLOUD_CLIENT, office=CLOUD_ME.officeId, S=CLOUD_SYNCED;
  var dirty=function(now, no){ var c=A.cases.find(function(x){ return x.id===no; }); return ((no in now.cases) && S.cases[no]!==now.cases[no]) || (!!c && isDirty(c)); };
  CLOUD_POLLING=true;
  return Promise.all([cl.from('cases').select(CLOUD_META_COLS).eq('office_id', office), cloudMembersLoad(cl, office)]).then(function(rs){
    var r=rs[0]; cloudChk(r); if (gen!==CLOUD_GEN || cloudPushing) return;
    var now=cloudSnapshot(), rows=r.data||[], seen={}, need=[], changed=false;
    rows.forEach(function(row){
      var no=row.case_no; seen[no]=1;
      if (!(no in S.cases)){ if (!(no in now.cases)) need.push(no); return; } /* 別人新建的案件 */
      if (row.version!==CLOUD_VER[no]){ if (!dirty(now, no)) need.push(no); return; } /* 內容被別人改過 */
      if (now.meta[no]===S.meta[no]){ /* 我沒改工作流程欄位：套用雲端的 */
        var m=cloudMetaFromRow(row), mj=JSON.stringify(metaPure(m));
        A.caseMeta=A.caseMeta||{}; var old=A.caseMeta[no];
        if (mj!==S.meta[no] || !old || old.updatedAt!==m.updatedAt){ A.caseMeta[no]=m; S.meta[no]=mj; changed=true; }
      }
    });
    Object.keys(S.cases).forEach(function(no){ if (!seen[no] && !dirty(now, no) && cloudRemoveLocal(no)) changed=true; }); /* 別人刪除的 */
    if (!need.length) return changed;
    return cl.from('cases').select(CLOUD_CASE_COLS).eq('office_id', office).in('case_no', need).then(function(r2){
      cloudChk(r2); if (gen!==CLOUD_GEN || cloudPushing) return false;
      var now2=cloudSnapshot();
      (r2.data||[]).forEach(function(row){ if (!dirty(now2, row.case_no)){ cloudApplyRow(row); changed=true; } });
      return changed;
    });
  }).then(function(changed){
    CLOUD_POLLING=false;
    if (changed && gen===CLOUD_GEN){ save(); render(); }
  }, function(e){ CLOUD_POLLING=false; console.warn('更新案件清單失敗', cloudErrMsg(e)); });
}
/* 歷程：這件案子的操作紀錄（新到舊，最多 50 筆） */
function cloudHistory(no){
  if (!CLOUD_ME || !CLOUD_CLIENT) return Promise.resolve([]);
  return CLOUD_CLIENT.from('audit_log').select('user_id, action, detail, at').eq('office_id', CLOUD_ME.officeId).eq('detail->>case_no', no).order('at', {ascending:false}).limit(50).then(function(r){ cloudChk(r); return r.data||[]; });
}
/* ===== 雲端實價登錄（P3-5）：登入後挑比較標的、租金行情直接查 public.lvr_records ===== */
var CLOUD_LVR_COLS = 'serial,kind,county,district,type,zone,ym,floor_num,total_floors,completed,age,area_ping,unit_wan,total_wan,rent_total,rent_per_ping,park,presale,elevator,mgmt,furnished,lease,special,note,addr,road';
var CLOUD_LVR_PAGE = 1000, CLOUD_LVR_MAX = 8000;
function cloudLvrSince(c, months){
  var pd=pdOf(c), y=Number(pd.slice(0,4)), m=Number(pd.slice(5,7)), t=y*12+(m-1)-(Math.round(Number(months))||0);
  return Math.floor(t/12)+'-'+('0'+(t%12+1)).slice(-2);
}
/* 依案件與模型規則組出兩組篩選條件（買賣、租賃），每項 [PostgREST 運算, 欄位, 值]；縣市空白回傳 null */
function cloudLvrSpec(c, M){
  var b=c.basic, R=M.select, RR=M.rentSelect || M.select; if (!b.county) return null;
  var land=isLandKind(c.kind), base=function(RX, kind){
    var f=[['eq','county',b.county]];
    if (RX.sameDistrict && b.district) f.push(['eq','district',b.district]);
    f.push(['gte','ym',cloudLvrSince(c, RX.months)]);
    f.push(['eq','kind',kind]);
    return f;
  };
  var sales=base(R, land?'landsale':'sale'); if (!land && R.sameType && b.btype) sales.push(['eq','type',b.btype]);
  var rents=base(RR, 'rent'); if (RR.sameType && b.btype) rents.push(['eq','type',b.btype]);
  return {sales:sales, rents:rents, months:Number(R.months)||0, county:b.county, district:(R.sameDistrict && b.district) ? b.district : ''};
}
function cloudLvrKey(c, M){ var sp=cloudLvrSpec(c, M); return sp ? JSON.stringify([sp.sales, sp.rents]) : ''; }
/* 分頁讀取（每頁 1000 筆、最多 8000 筆，依 ym 新到舊）；回傳 {rows, truncated} */
function cloudLvrFetch(cl, filters){
  var rows=[];
  function page(from){
    var q=cl.from('lvr_records').select(CLOUD_LVR_COLS);
    filters.forEach(function(f){ q=q[f[0]](f[1], f[2]); });
    return q.order('ym', {ascending:false}).order('serial').range(from, from+CLOUD_LVR_PAGE-1).then(function(r){
      cloudChk(r); var d=r.data||[]; rows=rows.concat(d);
      if (d.length<CLOUD_LVR_PAGE) return {rows:rows, truncated:false};
      if (rows.length>=CLOUD_LVR_MAX) return {rows:rows.slice(0, CLOUD_LVR_MAX), truncated:true};
      return page(from+CLOUD_LVR_PAGE);
    });
  }
  return page(0);
}
function cloudLvrApply(res, sp){
  A.cloudLvr = {sales:res.sales, rents:res.rents, counties:[sp.county], info:{county:sp.county, district:sp.district, months:sp.months}};
}
/* 在 render 開頭呼叫：登入且雲端資料讀完後，條件（key）改變才查；沒變就什麼都不做 */
function cloudLvrCheck(){
  if (!CLOUD_ME || !CLOUD_SYNCED || !CLOUD_CLIENT) return;
  var c=cur(), M=MOD(c), sp=cloudLvrSpec(c, M), key=cloudLvrKey(c, M);
  if (key===CLOUD_LVR_KEY) return;
  CLOUD_LVR_KEY=key; CLOUD_LVR_REQ++;
  if (!sp){ delete A.cloudLvr; CLOUD_LVR_LOADING=false; return; }
  if (CLOUD_LVR_CACHE[key]){ cloudLvrApply(CLOUD_LVR_CACHE[key], sp); CLOUD_LVR_LOADING=false; return; }
  cloudLvrRefresh(sp, key);
}
function cloudLvrRefresh(sp, key){
  var gen=CLOUD_GEN, req=CLOUD_LVR_REQ, cl=CLOUD_CLIENT;
  CLOUD_LVR_LOADING=true; setTimeout(function(){ cloudSetStatus(CLOUD_STATUS); }, 0);
  return Promise.all([cloudLvrFetch(cl, sp.sales), cloudLvrFetch(cl, sp.rents)]).then(function(rs){
    if (gen!==CLOUD_GEN || req!==CLOUD_LVR_REQ) return;
    var res={sales:rs[0].rows.map(lvrRowToRecord), rents:rs[1].rows.map(lvrRowToRecord)};
    CLOUD_LVR_CACHE[key]=res; CLOUD_LVR_LOADING=false;
    cloudLvrApply(res, sp); render();
    if (rs[0].truncated || rs[1].truncated) toast('符合條件的實價登錄超過 '+CLOUD_LVR_MAX+' 筆，只取最近的 '+CLOUD_LVR_MAX+' 筆，建議開啟同區篩選');
  }).catch(function(e){
    if (gen!==CLOUD_GEN || req!==CLOUD_LVR_REQ) return;
    CLOUD_LVR_LOADING=false; cloudSetStatus(CLOUD_STATUS); render(); toast('實價登錄讀取失敗：'+cloudErrMsg(e));
  });
}
/* 資料來源面板：實價登錄資料庫最近一次更新（null＝未查；{loading:true}；{at,season}；{err:true}） */
var CLOUD_LVR_COUNTIES='新北市、臺中市、新竹縣'; /* 與 GitHub 排程同步的縣市一致 */
var CLOUD_LVR_LAST=null;
function cloudLvrLastSync(){
  if (!CLOUD_ME || !CLOUD_CLIENT) return;
  if (CLOUD_LVR_LAST && (CLOUD_LVR_LAST.at || CLOUD_LVR_LAST.loading)) return;
  var gen=CLOUD_GEN, cl=CLOUD_CLIENT;
  CLOUD_LVR_LAST={loading:true};
  var done=function(v){ if (gen!==CLOUD_GEN) return; CLOUD_LVR_LAST=v; if (A.ui.sheet==='sources') render(); };
  /* 最近一次成功同步的日期，與資料庫裡最新的一季（補資料時處理順序不固定，所以分開查） */
  var q=function(col){ return cl.from('lvr_sync_log').select('season,at').eq('ok',true).order(col,{ascending:false}).limit(1); };
  Promise.all([q('at'), q('season')]).then(function(rs){
    var a=rs[0] && !rs[0].error && rs[0].data && rs[0].data[0], b=rs[1] && !rs[1].error && rs[1].data && rs[1].data[0];
    done(a && b ? {at:String(a.at).slice(0,10), season:b.season} : {err:true});
  }, function(){ done({err:true}); });
}
function cloudBoot(){
  var has=false;
  try { for (var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if (k && k.indexOf('sb-')===0 && k.slice(-11)==='-auth-token') { has=true; break; } } } catch(e){}
  var h=location.hash||'', q=location.search||'';
  if (/[#&]error(_description)?=/.test(h)){
    /* 恢復連結過期或無效：先清掉網址參數，避免 supabase-js 因網址帶錯誤而清掉既有登入 */
    try { history.replaceState(null, '', location.pathname); } catch(e){}
    setTimeout(function(){ toast('重設連結已失效，請重新申請'); }, 300);
  } else if (h.indexOf('type=recovery')>=0 || h.indexOf('access_token=')>=0 || q.indexOf('code=')>=0) has=true;
  if (!has) return;
  cloudRefresh().catch(function(e){ console.warn('雲端連線失敗', e && e.message); });
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') cloudBoot();
