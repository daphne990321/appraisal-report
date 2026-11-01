-- =====================================================================
-- 階段 A 案件管理：權限與版本測試（先執行 006_case_mgmt.sql）
-- 用法：Supabase 後台 → SQL Editor → 貼上全部 → Run。可重複執行。
-- 使用 P2-6 建立的測試帳號 B（隔離測試事務所B 的助理員）；
-- 「經營管理」的測試會暫時把 B 改成經營管理，測完自動改回助理員。
-- 測試建立的暫時案件在最後刪除。最後列出結果表：每一列「通過」都應為 true。
-- =====================================================================
create temp table if not exists p7_result(編號 int, 測試項目 text, 應該 text, 實際 text, 通過 boolean);
truncate p7_result;

do $$
declare
  ua uuid; ub uuid; oa uuid; ob uuid; v1 int; v2 int; n int; msg text;
  r_no int[] := '{}'; r_item text[] := '{}'; r_exp text[] := '{}'; r_act text[] := '{}'; r_ok boolean[] := '{}';
  i int;
begin
  select id into ua from auth.users where lower(email) = 'daphne990321@gmail.com';
  select id into ub from auth.users where lower(email) = 'daphne990321+test-b@gmail.com';
  select office_id into oa from public.members where user_id = ua;
  select office_id into ob from public.members where user_id = ub;
  if ub is null or ob is null then raise exception '找不到測試帳號 B，請先執行 003_isolation_test.sql'; end if;

  -- 清掉上次留下的暫時案件
  delete from public.audit_log where detail->>'case_no' like 'P7-%';
  delete from public.cases where case_no like 'P7-%' and not signed;
  update public.members set role = 'assistant' where user_id = ub;

  -- ===== 假裝是 B（助理員）=====
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.cases(office_id, case_no, data) values (ob, 'P7-T1', '{"id":"P7-T1","a":1}'::jsonb);
  select version, (assignee = ub)::int into v1, n from public.cases where case_no = 'P7-T1';
  r_no:=r_no||1; r_item:=r_item||'新增案件：版本從 1 開始、負責人預設為建立者'::text; r_exp:=r_exp||'版本 1、負責人＝B'::text; r_act:=r_act||('版本 '||v1||'、負責人'||(case when n=1 then '＝B' else '≠B' end)); r_ok:=r_ok||(v1=1 and n=1);

  update public.cases set data = '{"id":"P7-T1","a":2}'::jsonb where case_no = 'P7-T1';
  select version into v2 from public.cases where case_no = 'P7-T1';
  r_no:=r_no||2; r_item:=r_item||'改案件內容：版本加 1'::text; r_exp:=r_exp||'版本 2'::text; r_act:=r_act||('版本 '||v2); r_ok:=r_ok||(v2=2);

  update public.cases set stage = 'survey', due_date = date '2026-11-30' where case_no = 'P7-T1';
  select version into v2 from public.cases where case_no = 'P7-T1';
  r_no:=r_no||3; r_item:=r_item||'只改步驟與期限：版本不變'::text; r_exp:=r_exp||'版本 2'::text; r_act:=r_act||('版本 '||v2); r_ok:=r_ok||(v2=2);

  update public.cases set data = '{"id":"P7-T1","a":3}'::jsonb where case_no = 'P7-T1' and version = 1;
  get diagnostics n = row_count;
  r_no:=r_no||4; r_item:=r_item||'用舊版本號存檔（模擬別人已改過）'::text; r_exp:=r_exp||'0 筆被改'::text; r_act:=r_act||(n||' 筆被改'); r_ok:=r_ok||(n=0);

  begin
    update public.cases set assignee = ua where case_no = 'P7-T1';
    r_no:=r_no||5; r_item:=r_item||'負責人設成別家事務所的人'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||'成功（危險）'::text; r_ok:=r_ok||false;
  exception when others then
    r_no:=r_no||5; r_item:=r_item||'負責人設成別家事務所的人'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||('被拒絕：'||sqlerrm); r_ok:=r_ok||true;
  end;

  begin
    update public.cases set appraiser = ub where case_no = 'P7-T1';
    r_no:=r_no||6; r_item:=r_item||'簽證估價師設成助理員'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||'成功（錯誤）'::text; r_ok:=r_ok||false;
  exception when others then
    r_no:=r_no||6; r_item:=r_item||'簽證估價師設成助理員'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||('被拒絕：'||sqlerrm); r_ok:=r_ok||true;
  end;

  -- ===== 暫時把 B 改成經營管理 =====
  reset role;
  update public.members set role = 'manager' where user_id = ub;
  set local role authenticated;

  begin
    update public.cases set data = '{"id":"P7-T1","a":9}'::jsonb where case_no = 'P7-T1';
    r_no:=r_no||7; r_item:=r_item||'經營管理改案件內容'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||'成功（危險）'::text; r_ok:=r_ok||false;
  exception when others then
    r_no:=r_no||7; r_item:=r_item||'經營管理改案件內容'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||('被拒絕：'||sqlerrm); r_ok:=r_ok||true;
  end;

  begin
    update public.cases set status = 'review', stage = 'comps', due_date = date '2026-12-05', assignee = ub where case_no = 'P7-T1';
    get diagnostics n = row_count;
    r_no:=r_no||8; r_item:=r_item||'經營管理改狀態、步驟、期限、負責人'::text; r_exp:=r_exp||'成功'::text; r_act:=r_act||(n||' 筆被改'); r_ok:=r_ok||(n=1);
  exception when others then
    r_no:=r_no||8; r_item:=r_item||'經營管理改狀態、步驟、期限、負責人'::text; r_exp:=r_exp||'成功'::text; r_act:=r_act||('失敗：'||sqlerrm); r_ok:=r_ok||false;
  end;

  begin
    insert into public.cases(office_id, case_no, data) values (ob, 'P7-T2', '{}'::jsonb);
    r_no:=r_no||9; r_item:=r_item||'經營管理新增案件'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||'成功（錯誤）'::text; r_ok:=r_ok||false;
  exception when others then
    r_no:=r_no||9; r_item:=r_item||'經營管理新增案件'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||('被拒絕：'||sqlerrm); r_ok:=r_ok||true;
  end;

  begin
    delete from public.cases where case_no = 'P7-T1';
    get diagnostics n = row_count;
    r_no:=r_no||10; r_item:=r_item||'經營管理刪除案件'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||(n||' 筆被刪（錯誤）'); r_ok:=r_ok||(n=0);
  exception when others then
    r_no:=r_no||10; r_item:=r_item||'經營管理刪除案件'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||('被拒絕：'||sqlerrm); r_ok:=r_ok||true;
  end;

  begin
    update public.cases set signed = true where case_no = 'P7-T1';
    r_no:=r_no||11; r_item:=r_item||'經營管理簽名'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||'成功（危險）'::text; r_ok:=r_ok||false;
  exception when others then
    r_no:=r_no||11; r_item:=r_item||'經營管理簽名'::text; r_exp:=r_exp||'被拒絕'::text; r_act:=r_act||('被拒絕：'||sqlerrm); r_ok:=r_ok||true;
  end;

  -- ===== 回到管理者身分：檢查操作紀錄、改回助理員、清理 =====
  reset role;
  perform set_config('request.jwt.claims', '', true);
  update public.members set role = 'assistant' where user_id = ub;

  select count(*) into n from public.audit_log
   where detail->>'case_no' = 'P7-T1' and detail->'changes' ? 'stage' and detail->'changes' ? 'due_date';
  r_no:=r_no||12; r_item:=r_item||'操作紀錄記下步驟與期限的變更'::text; r_exp:=r_exp||'至少 1 筆'::text; r_act:=r_act||(n||' 筆'); r_ok:=r_ok||(n>=1);

  select count(*) into n from public.members where user_id = ub and role = 'assistant';
  r_no:=r_no||13; r_item:=r_item||'測試後 B 已改回助理員'::text; r_exp:=r_exp||'是'::text; r_act:=r_act||(case when n=1 then '是' else '否' end); r_ok:=r_ok||(n=1);

  delete from public.audit_log where detail->>'case_no' like 'P7-%';
  delete from public.cases where case_no like 'P7-%' and not signed;

  for i in 1..coalesce(array_length(r_no, 1), 0) loop
    insert into p7_result values (r_no[i], r_item[i], r_exp[i], r_act[i], r_ok[i]);
  end loop;
end $$;

select 編號, 測試項目, 應該, 實際, 通過 from p7_result order by 編號;
