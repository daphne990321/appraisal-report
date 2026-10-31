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
var cloudSyncT = null, cloudPushing = false, cloudPushAgain = false;
function loadSupabase(){
  if (CLOUD_CLIENT) return Promise.resolve(CLOUD_CLIENT);
  if (loadSupabase._p) return loadSupabase._p;
  loadSupabase._p = new Promise(function(res, rej){
    var fail=function(){ loadSupabase._p=null; rej(new Error('無法連線到雲端，請確認網路')); };
    var done=function(){ try { CLOUD_CLIENT = window.supabase.createClient(CLOUD.url, CLOUD.key); res(CLOUD_CLIENT); } catch(e){ fail(); } };
    if (window.supabase && window.supabase.createClient) { done(); return; }
    var s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'; s.onload=done; s.onerror=fail; document.head.appendChild(s);
  });
  return loadSupabase._p;
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
  A.ui.loginEmail=email; A.ui.logging=true; render();
  cloudSignIn(email, password).then(function(){ A.ui.logging=false; if (A.ui.sheet==='login') render(); }, function(err){ A.ui.logging=false; render(); toast((err&&err.message)||'登入失敗'); });
}
function cloudSignOut(){
  var done=function(){
    CLOUD_GEN++; clearTimeout(cloudSyncT); clearTimeout(saveT); /* 避免舊資料晚一步寫回 localStorage */
    CLOUD_ME=null; CLOUD_SYNCED=null; CLOUD_STATUS=''; cloudPushAgain=false;
    var bak=null;
    try { bak=localStorage.getItem(CLOUD_BACKUP_KEY); if (bak!==null){ localStorage.setItem(KEY, bak); localStorage.removeItem(CLOUD_BACKUP_KEY); } } catch(e){}
    A = (bak!==null) ? load() : fresh();
    A.ui={};
    render(); toast('已登出，這台電腦已改回登入前的本機資料');
  };
  loadSupabase().then(function(cl){ return cl.auth.signOut(); }).then(done, function(err){ toast((err&&err.message)||'登出失敗'); });
}
/* ===== 雲端同步（P2-4） ===== */
function cloudStatusText(){ return CLOUD_STATUS==='syncing' ? '同步中…' : CLOUD_STATUS==='ok' ? '已同步' : CLOUD_STATUS==='error' ? '同步失敗' : ''; }
/* 只改狀態文字，不整頁 render()（避免輸入中游標跳掉）；桌面用 #cloudStatus，手機選單用 .cloud-st */
function cloudSetStatus(st){
  CLOUD_STATUS=st;
  try {
    var els=document.querySelectorAll('.cloud-st');
    for (var i=0;i<els.length;i++){ els[i].textContent=cloudStatusText(); els[i].style.color = st==='error' ? 'var(--fail)' : ''; els[i].style.fontWeight = st==='error' ? '700' : ''; }
  } catch(e){}
}
function cloudCaseRow(c){ return {office_id:CLOUD_ME.officeId, case_no:c.id, kind:c.kind||null, signed:!!c.signed, data:c}; }
function cloudModelRow(m){ return {office_id:CLOUD_ME.officeId, model_key:m.id, name:m.name||m.id, data:m}; }
function cloudSettingsOf(){ return {own:A.own, imported:A.imported, hideBuiltin:!!A.hideBuiltin}; }
function cloudSnapshot(){
  var o={cases:{}, models:{}, settings:JSON.stringify(cloudSettingsOf())};
  A.cases.forEach(function(c){ o.cases[c.id]=JSON.stringify(c); });
  A.models.forEach(function(m){ o.models[m.id]=JSON.stringify(m); });
  return o;
}
function cloudBackupLocal(){
  try { if (localStorage.getItem(CLOUD_BACKUP_KEY)===null){ var raw=localStorage.getItem(KEY); if (raw!==null) localStorage.setItem(CLOUD_BACKUP_KEY, raw); } } catch(e){}
}
function cloudErrMsg(e){ return (e && e.message) || String(e || '未知錯誤'); }
function cloudChk(r){ if (r && r.error) throw new Error(cloudErrMsg(r.error)); return r; }
function cloudPull(){
  var gen=++CLOUD_GEN, office=CLOUD_ME.officeId, cl=CLOUD_CLIENT;
  CLOUD_SYNCED=null; clearTimeout(cloudSyncT); cloudSetStatus('syncing');
  return Promise.all([
    cl.from('cases').select('case_no, signed, data').eq('office_id', office),
    cl.from('models').select('model_key, data').eq('office_id', office),
    cl.from('office_settings').select('data').eq('office_id', office).maybeSingle()
  ]).then(function(rs){
    if (gen!==CLOUD_GEN) return;
    var rc=cloudChk(rs[0]), rm=cloudChk(rs[1]), rst=cloudChk(rs[2]);
    var cs=(rc.data||[]).slice().sort(function(a,b){ return a.case_no<b.case_no?-1:a.case_no>b.case_no?1:0; });
    var ms=(rm.data||[]).slice().sort(function(a,b){ return a.model_key<b.model_key?-1:a.model_key>b.model_key?1:0; });
    var st=rst.data && rst.data.data;
    cloudBackupLocal();
    if (!cs.length && !ms.length){
      /* 第一次使用：把這台電腦的資料整批上傳 */
      var ups=[
        cl.from('cases').upsert(A.cases.map(cloudCaseRow), {onConflict:'office_id,case_no'}),
        cl.from('models').upsert(A.models.map(cloudModelRow), {onConflict:'office_id,model_key'}),
        cl.from('office_settings').upsert({office_id:office, data:cloudSettingsOf()}, {onConflict:'office_id'})
      ];
      return Promise.all(ups).then(function(us){
        us.forEach(cloudChk);
        if (gen!==CLOUD_GEN) return;
        CLOUD_SYNCED=cloudSnapshot(); cloudSetStatus('ok'); save(); render();
        toast('已把這台電腦的 '+A.cases.length+' 件案件上傳到雲端');
      });
    }
    var needUpModels=false, needUpCases=false;
    if (cs.length) A.cases=cs.map(function(r){ var c=r.data; c.signed=!!r.signed; return c; }); else needUpCases=true;
    if (ms.length) A.models=ms.map(function(r){ return r.data; }); else needUpModels=true;
    if (st){
      if (st.own) A.own=st.own;
      if (st.imported) A.imported=st.imported;
      if ('hideBuiltin' in st) A.hideBuiltin=!!st.hideBuiltin;
    }
    if (!A.cases.some(function(c){ return c.id===A.caseId; })) A.caseId=A.cases[0].id;
    if (!A.models.some(function(m){ return m.id===A.pModel; })) A.pModel=A.models[0].id;
    var fin=function(){
      if (gen!==CLOUD_GEN) return;
      CLOUD_SYNCED=cloudSnapshot(); cloudSetStatus('ok'); save(); render();
    };
    /* 雲端只有其中一種資料時，把本機缺的那一種補傳上去，避免顯示「已同步」卻沒上傳 */
    var ups2=[];
    if (needUpModels) ups2.push(cl.from('models').upsert(A.models.map(cloudModelRow), {onConflict:'office_id,model_key'}));
    if (needUpCases) ups2.push(cl.from('cases').upsert(A.cases.map(cloudCaseRow), {onConflict:'office_id,case_no'}));
    if (ups2.length) return Promise.all(ups2).then(function(us){ us.forEach(cloudChk); fin(); });
    fin();
  }).catch(function(e){
    if (gen!==CLOUD_GEN) return;
    cloudSetStatus('error'); toast('雲端讀取失敗：'+cloudErrMsg(e));
  });
}
function cloudScheduleSync(){
  if (!CLOUD_ME || !CLOUD_SYNCED) return;
  clearTimeout(cloudSyncT); cloudSyncT=setTimeout(cloudPush, 2000);
}
function cloudPush(){
  if (!CLOUD_ME || !CLOUD_SYNCED) return Promise.resolve();
  if (cloudPushing){ cloudPushAgain=true; return Promise.resolve(); }
  var gen=CLOUD_GEN, cl=CLOUD_CLIENT, office=CLOUD_ME.officeId, S=CLOUD_SYNCED, now=cloudSnapshot();
  var wasSigned=function(js){ try { return !!JSON.parse(js).signed; } catch(e){ return false; } };
  var jobs=[]; /* {run:function→Promise, ok:function} */
  A.cases.forEach(function(c){
    var js=now.cases[c.id];
    if (S.cases[c.id]===js) return;
    if (c.id in S.cases && wasSigned(S.cases[c.id])) return; /* 已簽名：資料庫不允許改 */
    jobs.push({run:function(){ return cl.from('cases').upsert(cloudCaseRow(JSON.parse(js)), {onConflict:'office_id,case_no'}); }, ok:function(){ S.cases[c.id]=js; }});
  });
  Object.keys(S.cases).forEach(function(id){
    if (id in now.cases || wasSigned(S.cases[id])) return;
    jobs.push({run:function(){ return cl.from('cases').delete().eq('office_id', office).eq('case_no', id); }, ok:function(){ delete S.cases[id]; }});
  });
  A.models.forEach(function(m){
    var js=now.models[m.id];
    if (S.models[m.id]===js) return;
    jobs.push({run:function(){ return cl.from('models').upsert(cloudModelRow(JSON.parse(js)), {onConflict:'office_id,model_key'}); }, ok:function(){ S.models[m.id]=js; }});
  });
  Object.keys(S.models).forEach(function(id){
    if (id in now.models) return;
    jobs.push({run:function(){ return cl.from('models').delete().eq('office_id', office).eq('model_key', id); }, ok:function(){ delete S.models[id]; }});
  });
  if (S.settings!==now.settings) jobs.push({run:function(){ return cl.from('office_settings').upsert({office_id:office, data:JSON.parse(now.settings)}, {onConflict:'office_id'}); }, ok:function(){ S.settings=now.settings; }});
  if (!jobs.length) return Promise.resolve();
  cloudPushing=true; cloudSetStatus('syncing');
  var firstErr=null, chain=Promise.resolve();
  jobs.forEach(function(j){
    chain=chain.then(function(){ return j.run(); }).then(function(r){ cloudChk(r); if (gen===CLOUD_GEN) j.ok(); }).catch(function(e){ if (!firstErr) firstErr=e; });
  });
  return chain.then(function(){
    cloudPushing=false;
    if (gen!==CLOUD_GEN) return;
    if (firstErr){ cloudSetStatus('error'); toast('雲端儲存失敗：'+cloudErrMsg(firstErr)); }
    else cloudSetStatus('ok');
    if (cloudPushAgain){ cloudPushAgain=false; if (!firstErr) cloudScheduleSync(); }
  });
}
function cloudBoot(){
  var has=false;
  try { for (var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if (k && k.indexOf('sb-')===0 && k.slice(-11)==='-auth-token') { has=true; break; } } } catch(e){}
  if (!has) return;
  cloudRefresh().catch(function(e){ console.warn('雲端連線失敗', e && e.message); });
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') cloudBoot();
