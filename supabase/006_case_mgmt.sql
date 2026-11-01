-- =====================================================================
-- 階段 A 案件管理：多人協作（負責人、簽證估價師、步驟、狀態、期限、版本）
-- 用法：Supabase 後台 → SQL Editor → 貼上全部 → Run。只需執行一次（可重複執行）。
-- 設計：線上服務開發/設計_階段A_案件管理.md
--
-- 1. 成員身分加「經營管理」（manager）與「在職」欄位
-- 2. 案件加工作流程欄位（獨立欄位，換負責人不會動到案件內容）
-- 3. version：案件內容（data）每改一次加 1；網頁存檔時比對版本，偵測兩人同時修改
-- 4. 權限（簡易分層，訪談後再調整）：
--      估價師：全部可改、可簽名
--      助理：可改未簽名案件、可換負責人，不能簽名
--      經營管理：可換負責人、改步驟／狀態／期限，不能改案件內容、不能新增或刪除案件、不能簽名
-- 5. 操作紀錄多記「負責人、步驟、狀態、期限」的變更（舊值→新值）
-- =====================================================================

-- ---------- 1. 成員 ----------
alter table public.members drop constraint if exists members_role_check;
alter table public.members add constraint members_role_check check (role in ('appraiser', 'assistant', 'manager'));
alter table public.members add column if not exists active boolean not null default true;
-- 沒有顯示名稱的成員，先用 Email 的 @ 前面當名稱（之後可在後台改）
update public.members m set display_name = split_part(u.email, '@', 1)
from auth.users u where u.id = m.user_id and coalesce(m.display_name, '') = '';

-- ---------- 2. 案件的工作流程欄位 ----------
alter table public.cases add column if not exists assignee  uuid references auth.users(id) on delete set null;  -- 目前負責人
alter table public.cases add column if not exists appraiser uuid references auth.users(id) on delete set null;  -- 簽證估價師
alter table public.cases add column if not exists stage     text not null default 'intake';
alter table public.cases add column if not exists status    text not null default 'active';
alter table public.cases add column if not exists due_date  date;
alter table public.cases add column if not exists version   integer not null default 1;
alter table public.cases drop constraint if exists cases_stage_check;
alter table public.cases add constraint cases_stage_check check (stage in ('intake','docs','survey','comps','calc','decide','deliver'));
alter table public.cases drop constraint if exists cases_status_check;
alter table public.cases add constraint cases_status_check check (status in ('active','review','returned','hold','cancelled'));
create index if not exists cases_office_assignee_idx on public.cases(office_id, assignee);

-- 既有案件：負責人與簽證估價師先設為建立者；已簽名的案件步驟設為「簽名交付」
-- （已簽名案件受保護不能改，所以補資料時暫停觸發器）
alter table public.cases disable trigger cases_guard;
alter table public.cases disable trigger cases_stamp;
alter table public.cases disable trigger cases_log;
update public.cases c set
  assignee  = coalesce(c.assignee, c.created_by),
  appraiser = coalesce(c.appraiser, (select m.user_id from public.members m where m.user_id = c.created_by and m.role = 'appraiser')),
  stage     = case when c.signed then 'deliver' else c.stage end;
alter table public.cases enable trigger cases_guard;
alter table public.cases enable trigger cases_stamp;
alter table public.cases enable trigger cases_log;

-- ---------- 3. 修改人、時間、版本 ----------
create or replace function private.stamp_row() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  if tg_table_name = 'cases' then
    if tg_op = 'INSERT' then
      new.created_by := (select auth.uid());
      new.assignee   := coalesce(new.assignee, (select auth.uid()));
      new.version    := 1;
    else
      -- 版本只由資料庫決定：案件內容有變才加 1；只換負責人、期限等不加
      new.version := old.version + case when new.data is distinct from old.data or new.signed is distinct from old.signed then 1 else 0 end;
    end if;
  end if;
  return new;
end $$;

-- ---------- 4. 權限檢查 ----------
create or replace function private.guard_case() returns trigger
  language plpgsql set search_path = ''
as $$
declare
  r text := (select private.my_role());
begin
  if tg_op in ('UPDATE', 'DELETE') and old.signed then
    raise exception '已簽名的案件不能修改或刪除（案號 %）', old.case_no;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.signed and r is distinct from 'appraiser' then
    raise exception '只有估價師可以簽名';
  end if;
  if tg_op = 'UPDATE' and new.office_id <> old.office_id then
    raise exception '案件不能移到其他事務所';
  end if;
  -- 經營管理：只能改負責人、簽證估價師、步驟、狀態、期限
  if r = 'manager' then
    if tg_op in ('INSERT', 'DELETE') then
      raise exception '經營管理身分不能新增或刪除案件';
    end if;
    if new.data is distinct from old.data or new.case_no is distinct from old.case_no
       or new.kind is distinct from old.kind or new.signed is distinct from old.signed then
      raise exception '經營管理身分不能修改案件內容';
    end if;
  end if;
  -- 負責人、簽證估價師必須是同一家事務所的成員；簽證估價師必須是估價師
  if tg_op in ('INSERT', 'UPDATE') then
    if new.assignee is not null and not exists (
         select 1 from public.members m where m.user_id = new.assignee and m.office_id = new.office_id) then
      raise exception '負責人不是本事務所的成員';
    end if;
    if new.appraiser is not null and not exists (
         select 1 from public.members m where m.user_id = new.appraiser and m.office_id = new.office_id and m.role = 'appraiser') then
      raise exception '簽證估價師必須是本事務所的估價師';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

-- ---------- 5. 操作紀錄：多記工作流程欄位的變更 ----------
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
      if new.data      is distinct from old.data      then ch := ch || jsonb_build_object('data', true); end if;
      if ch = '{}'::jsonb then return null; end if;   -- 什麼都沒變就不記
    end if;
  end if;
  insert into public.audit_log(office_id, user_id, case_id, action, detail)
  values (r.office_id, (select auth.uid()), r.id, act, jsonb_build_object('case_no', r.case_no, 'changes', ch));
  return null;
end $$;
revoke all on function private.log_case() from public, anon, authenticated;

-- 確認結果
select o.name as 事務所, coalesce(m.display_name, '') as 名稱, m.role as 身分, m.active as 在職
from public.members m join public.offices o on o.id = m.office_id order by 1, 3;
