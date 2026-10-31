/* 雲端登入（瀏覽器專用，Node 端 lib/engine.js、測試、MCP 不載入此檔）
   P2-3：只做 Supabase 登入／登出與顯示目前登入的事務所；案件尚未存雲端（P2-4）。 */
var CLOUD = {url:'https://ucqcwxawntocqkwlanbp.supabase.co', key:'sb_publishable_F-T_ZM4BtwiJ4ItTX2K0Vg_AM5bY7n8'};
var CLOUD_ME = null;
var CLOUD_CLIENT = null;
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
  var done=function(){ CLOUD_ME=null; if ('cloudPrevRole' in A.ui){ A.role=A.ui.cloudPrevRole; delete A.ui.cloudPrevRole; } render(); toast('已登出'); };
  loadSupabase().then(function(cl){ return cl.auth.signOut(); }).then(done, function(err){ toast((err&&err.message)||'登出失敗'); });
}
function cloudBoot(){
  var has=false;
  try { for (var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if (k && k.indexOf('sb-')===0 && k.slice(-11)==='-auth-token') { has=true; break; } } } catch(e){}
  if (!has) return;
  cloudRefresh().catch(function(e){ console.warn('雲端連線失敗', e && e.message); });
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') cloudBoot();
