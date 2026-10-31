-- =====================================================================
-- P2-6 資料隔離測試
-- 用法：先在 Authentication → Users 建立測試帳號 B（勾 Auto Confirm User），
--       再到 SQL Editor 貼上全部 → Run。可重複執行。
--
-- 做什麼：
-- 1. 建立「隔離測試事務所B」，把帳號 B 設為該事務所的「助理員」
-- 2. 用資料庫的「模擬身分」功能，假裝是 B 去讀、寫、改、刪 A（靈嶼測試事務所）的資料，
--    再假裝是 A 去看 B 的資料，逐項記錄是否被擋下
-- 3. 會修改或刪除資料的測試一律自動復原；測試建立的暫時案件在最後刪除
-- 4. 最後列出結果表：每一列「通過」都應為 true
-- =====================================================================

-- ---------- 設定：兩個帳號的 Email ----------
create temp table if not exists p26_cfg(a_email text, b_email text, b_office text);
truncate p26_cfg;
insert into p26_cfg values ('daphne990321@gmail.com', 'daphne990321+test-b@gmail.com', '隔離測試事務所B');

-- ---------- 建立事務所 B 與成員 B（助理員） ----------
do $$
declare cfg record; ub uuid; ob uuid;
begin
  select * into cfg from p26_cfg;
  select id into ub from auth.users where lower(email) = lower(cfg.b_email);
  if ub is null then raise exception '找不到測試帳號 %，請先到 Authentication → Users 建立', cfg.b_email; end if;
  select id into ob from public.offices where name = cfg.b_office;
  if ob is null then insert into public.offices(name) values (cfg.b_office) returning id into ob; end if;
  insert into public.members(user_id, office_id, role) values (ub, ob, 'assistant')
  on conflict (user_id) do update set office_id = excluded.office_id, role = excluded.role;
end $$;

-- ---------- 測試 ----------
create temp table if not exists p26_result(編號 int, 測試項目 text, 應該 text, 實際 text, 通過 boolean);
truncate p26_result;

do $$
declare
  cfg record; ua uuid; ub uuid; oa uuid; ob uuid; n int; n_a int;
  r_no int[] := '{}'; r_item text[] := '{}'; r_exp text[] := '{}'; r_act text[] := '{}'; r_ok boolean[] := '{}';
  i int;
begin
  select * into cfg from p26_cfg;
  select id into ua from auth.users where lower(email) = lower(cfg.a_email);
  select id into ub from auth.users where lower(email) = lower(cfg.b_email);
  select office_id into oa from public.members where user_id = ua;
  select office_id into ob from public.members where user_id = ub;
  if ua is null or oa is null then raise exception '找不到帳號 A（%）或其事務所', cfg.a_email; end if;
  if ob is null or ob = oa then raise exception '帳號 B 必須屬於另一家事務所'; end if;
  select count(*) into n_a from public.cases where office_id = oa;   -- 以管理者身分先數 A 的案件數

  -- 清掉上次測試可能留下的暫時案件
  delete from public.audit_log where detail->>'case_no' like 'P26-%';
  delete from public.cases where case_no like 'P26-%' and not signed;

  -- ===== 假裝是 B（隔離測試事務所B 的助理員）=====
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.cases where office_id = oa;
  r_no:=r_no||1; r_item:=r_item||'B 讀取 A 的案件'::text; r_exp:=r_exp||'0 筆'::text; r_act:=r_act||(n||' 筆（A 實際有 '||n_a||' 筆）'); r_ok:=r_ok||(n=0);

  select count(*) into n from public.offices where id = oa;
  r_no:=r_no||2; r_item:=r_item||'B 讀取 A 的事務所資料'::text; r_exp:=r_exp||'0 筆'::text; r_act:=r_act||(n||' 筆'); r_ok:=r_ok||(n=0);

  select count(*) into n from public.members where office_id = oa;
  r_no:=r_no||3; r_item:=r_item||'B 讀取 A 的成員名單'::text; r_exp:=r_exp||'0 筆'::text; r_act:=r_act||(n||' 筆'); r_ok:=r_ok||(n=0);

  select count(*) into n from public.models where office_id = oa;
  r_no:=r_no||4; r_item:=r_item||'B 讀取 A 的估價模型'::text; r_exp:=r_exp||'0 筆'::text; r_act:=r_act||(n||' 筆'); r_ok:=r_ok||(n=0);

  select count(*) into n from public.office_settings where office_id = oa;
  r_no:=r_no||5; r_item:=r_item||'B 讀取 A 的本所案例與實價登錄'::text; r_exp:=r_exp||'0 筆'::text; r_act:=r_act||(n||' 筆'); r_ok:=r_ok||(n=0);

  select count(*) into n from public.audit_log where office_id = oa;
  r_no:=r_no||6; r_item:=r_item||'B 讀取 A 的操作紀錄'::text; r_exp:=r_exp||'0 筆'::text; r_act:=r_act||(n||' 筆'); r_ok:=r_ok||(n=0);

  begin
    insert into public.cases(office_id, case_no, data) values (oa, 'P26-HACK', '{}'::jsonb);
    r_no:=r_no||7; r_item:=r_item||'B 新增案件到 A'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||'成功寫入（危險）'::text; r_ok:=r_ok||false;
    raise exception 'P26_UNDO';
  exception when others then
    if sqlerrm <> 'P26_UNDO' then
      r_no:=r_no||7; r_item:=r_item||'B 新增案件到 A'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||('被拒絕：'||sqlerrm); r_ok:=r_ok||true;
    end if;
  end;

  n := -1;
  begin
    update public.cases set kind = kind where office_id = oa;
    get diagnostics n = row_count;
    raise exception 'P26_UNDO';
  exception when others then null;
  end;
  r_no:=r_no||8; r_item:=r_item||'B 修改 A 的案件'::text; r_exp:=r_exp||'0 筆被改'::text; r_act:=r_act||(case when n<0 then '被拒絕' else n||' 筆被改（已自動復原）' end); r_ok:=r_ok||(n<=0);

  n := -1;
  begin
    delete from public.cases where office_id = oa;
    get diagnostics n = row_count;
    raise exception 'P26_UNDO';
  exception when others then null;
  end;
  r_no:=r_no||9; r_item:=r_item||'B 刪除 A 的案件'::text; r_exp:=r_exp||'0 筆被刪'::text; r_act:=r_act||(case when n<0 then '被拒絕' else n||' 筆被刪（已自動復原）' end); r_ok:=r_ok||(n<=0);

  begin
    insert into public.cases(office_id, case_no, data) values (ob, 'P26-B-TEST', '{"id":"P26-B-TEST"}'::jsonb);
    select count(*) into n from public.cases where office_id = ob and case_no = 'P26-B-TEST';
    r_no:=r_no||10; r_item:=r_item||'B 在自己事務所新增並讀回案件'::text; r_exp:=r_exp||'成功'::text; r_act:=r_act||(case when n=1 then '成功' else '讀不到' end); r_ok:=r_ok||(n=1);
  exception when others then
    r_no:=r_no||10; r_item:=r_item||'B 在自己事務所新增並讀回案件'::text; r_exp:=r_exp||'成功'::text; r_act:=r_act||('失敗：'||sqlerrm); r_ok:=r_ok||false;
  end;

  begin
    update public.cases set signed = true where office_id = ob and case_no = 'P26-B-TEST';
    r_no:=r_no||11; r_item:=r_item||'助理員 B 簽名'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||'簽名成功（危險）'::text; r_ok:=r_ok||false;
    raise exception 'P26_UNDO';
  exception when others then
    if sqlerrm <> 'P26_UNDO' then
      r_no:=r_no||11; r_item:=r_item||'助理員 B 簽名'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||('被拒絕：'||sqlerrm); r_ok:=r_ok||true;
    end if;
  end;

  begin
    update public.cases set office_id = oa where office_id = ob and case_no = 'P26-B-TEST';
    get diagnostics n = row_count;
    r_no:=r_no||12; r_item:=r_item||'B 把自己的案件搬到 A'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||(n||' 筆被搬（已自動復原）'); r_ok:=r_ok||(n=0);
    raise exception 'P26_UNDO';
  exception when others then
    if sqlerrm <> 'P26_UNDO' then
      r_no:=r_no||12; r_item:=r_item||'B 把自己的案件搬到 A'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||('被拒絕：'||sqlerrm); r_ok:=r_ok||true;
    end if;
  end;

  begin
    update public.members set role = 'appraiser', office_id = oa where user_id = ub;
    get diagnostics n = row_count;
    r_no:=r_no||13; r_item:=r_item||'B 自己改成估價師或換到 A 事務所'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||(n||' 筆被改（已自動復原）'); r_ok:=r_ok||(n=0);
    raise exception 'P26_UNDO';
  exception when others then
    if sqlerrm <> 'P26_UNDO' then
      r_no:=r_no||13; r_item:=r_item||'B 自己改成估價師或換到 A 事務所'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||('被拒絕：'||sqlerrm); r_ok:=r_ok||true;
    end if;
  end;

  -- ===== 假裝是 A（靈嶼測試事務所的估價師）=====
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.cases where case_no = 'P26-B-TEST';
  r_no:=r_no||14; r_item:=r_item||'A 讀取 B 的案件'::text; r_exp:=r_exp||'0 筆'::text; r_act:=r_act||(n||' 筆'); r_ok:=r_ok||(n=0);

  select count(*) into n from public.cases;
  r_no:=r_no||15; r_item:=r_item||'A 讀取自己的案件（確認不是全部擋光）'::text; r_exp:=r_exp||(n_a||' 筆'); r_act:=r_act||(n||' 筆'); r_ok:=r_ok||(n=n_a);

  -- ===== 回到管理者身分，清理暫時資料並寫出結果 =====
  reset role;
  perform set_config('request.jwt.claims', '', true);
  delete from public.audit_log where detail->>'case_no' like 'P26-%';
  delete from public.cases where case_no like 'P26-%' and not signed;

  for i in 1..coalesce(array_length(r_no, 1), 0) loop
    insert into p26_result values (r_no[i], r_item[i], r_exp[i], r_act[i], r_ok[i]);
  end loop;
end $$;

select 編號, 測試項目, 應該, 實際, 通過 from p26_result order by 編號;
