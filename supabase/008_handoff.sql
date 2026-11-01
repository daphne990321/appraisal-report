-- =====================================================================
-- 階段 B 交接與退回：案件加「最近一次交接留言」
-- 用法：Supabase 後台 → SQL Editor → 貼上全部 → Run。可重複執行。（先執行過 006）
-- 設計：線上服務開發/設計_階段B_流程步驟.md
-- 這三個欄位和負責人一樣屬於工作流程欄位：改了不會讓案件版本號增加；經營管理也可以改
-- =====================================================================
alter table public.cases add column if not exists handoff_note text;
alter table public.cases add column if not exists handoff_by   uuid references auth.users(id) on delete set null;
alter table public.cases add column if not exists handoff_at   timestamptz;
alter table public.cases drop constraint if exists cases_handoff_note_len;
alter table public.cases add constraint cases_handoff_note_len check (char_length(handoff_note) <= 500);

-- 交接人一律記成目前登入者、時間由資料庫決定（網頁不能冒名）
create or replace function private.stamp_handoff() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.handoff_note is distinct from old.handoff_note then
    if new.handoff_note is null then
      new.handoff_by := null; new.handoff_at := null;
    else
      new.handoff_by := (select auth.uid()); new.handoff_at := now();
    end if;
  else
    new.handoff_by := old.handoff_by; new.handoff_at := old.handoff_at;
  end if;
  return new;
end $$;
drop trigger if exists cases_handoff on public.cases;
create trigger cases_handoff before insert or update on public.cases
  for each row execute function private.stamp_handoff();

-- 操作紀錄：多記交接留言
create or replace function private.log_case() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  r public.cases;
  act text := lower(tg_op);
  ch jsonb := '{}'::jsonb;
begin
  if tg_op = 'DELETE' then
    r := old;
  else
    r := new;
    if tg_op = 'UPDATE' then
      if new.signed and not old.signed then act := 'sign'; end if;
      if new.assignee  is distinct from old.assignee  then ch := ch || jsonb_build_object('assignee',  jsonb_build_array(old.assignee,  new.assignee));  end if;
      if new.appraiser is distinct from old.appraiser then ch := ch || jsonb_build_object('appraiser', jsonb_build_array(old.appraiser, new.appraiser)); end if;
      if new.stage     is distinct from old.stage     then ch := ch || jsonb_build_object('stage',     jsonb_build_array(old.stage,     new.stage));     end if;
      if new.status    is distinct from old.status    then ch := ch || jsonb_build_object('status',    jsonb_build_array(old.status,    new.status));    end if;
      if new.due_date  is distinct from old.due_date  then ch := ch || jsonb_build_object('due_date',  jsonb_build_array(old.due_date,  new.due_date));  end if;
      if new.handoff_note is distinct from old.handoff_note and new.handoff_note is not null then ch := ch || jsonb_build_object('note', new.handoff_note); end if;
      if new.data      is distinct from old.data      then ch := ch || jsonb_build_object('data', true); end if;
      if ch = '{}'::jsonb then return null; end if;
    end if;
  end if;
  insert into public.audit_log(office_id, user_id, case_id, action, detail)
  values (r.office_id, (select auth.uid()), r.id, act, jsonb_build_object('case_no', r.case_no, 'changes', ch));
  return null;
end $$;
revoke all on function private.log_case() from public, anon, authenticated;

-- 確認結果：應列出 3 個新欄位
select column_name as 新欄位, data_type as 型態 from information_schema.columns
where table_schema = 'public' and table_name = 'cases' and column_name like 'handoff%' order by 1;
