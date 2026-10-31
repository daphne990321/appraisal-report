-- =====================================================================
-- P2-2 估價報告產生器：資料表與權限（Supabase / PostgreSQL）
-- 用法：Supabase 後台 → SQL Editor → 貼上全部 → Run。只需執行一次。
--
-- 設計原則
-- 1. 所有事務所共用一個資料庫；每筆資料都標明 office_id（屬於哪家事務所）
-- 2. 每張表都開啟 RLS（列級權限）：登入者只能讀寫「自己事務所」的資料
-- 3. 使用者屬於哪家事務所、是估價師還是助理，記在 members 表，
--    只有管理者（你，在 Supabase 後台）能改，使用者自己改不了
-- 4. 已簽名的案件不能修改或刪除；只有估價師能簽名（與網頁版規則一致）
-- 5. 案件的新增、修改、刪除都自動寫入操作紀錄 audit_log
-- 6. 網頁版只拿得到公開金鑰；不開放未登入者讀任何資料（keepalive 除外）
-- =====================================================================

-- ---------- 不對外公開的工具函式放在 private schema ----------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ---------- 事務所 ----------
create table public.offices (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  tax_id      text,                       -- 統一編號
  guild       text,                       -- 公會
  plan        text not null default 'trial',
  created_at  timestamptz not null default now()
);

-- ---------- 成員：一個登入帳號屬於一家事務所 ----------
create table public.members (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  office_id     uuid not null references public.offices(id) on delete restrict,
  role          text not null default 'appraiser' check (role in ('appraiser', 'assistant')),
  display_name  text,
  cert_no       text,                     -- 估價師證書字號
  created_at    timestamptz not null default now()
);
create index members_office_idx on public.members(office_id);

-- ---------- 登入者所屬事務所與角色（給權限規則使用） ----------
-- security definer：讓權限規則能查 members 表；放在 private 且只回傳「自己」的資料
create or replace function private.my_office_id() returns uuid
  language sql stable security definer set search_path = ''
as $$ select office_id from public.members where user_id = (select auth.uid()) $$;

create or replace function private.my_role() returns text
  language sql stable security definer set search_path = ''
as $$ select role from public.members where user_id = (select auth.uid()) $$;

revoke all on function private.my_office_id() from public, anon;
revoke all on function private.my_role() from public, anon;
grant execute on function private.my_office_id() to authenticated;
grant execute on function private.my_role() to authenticated;

-- ---------- 案件：整筆案件 JSON 存在 data（與網頁版、MCP 版的案件檔相同格式） ----------
create table public.cases (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references public.offices(id) on delete restrict,
  case_no     text not null,              -- 案號，例：115-0412
  kind        text,                       -- 標的類型，例：unit、land、hotel
  signed      boolean not null default false,
  data        jsonb not null,
  created_by  uuid references auth.users(id) on delete set null,
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (office_id, case_no)
);
create index cases_office_idx on public.cases(office_id);

-- ---------- 估價模型：每家事務所自己的模型 ----------
create table public.models (
  id          uuid primary key default gen_random_uuid(),
  office_id   uuid not null references public.offices(id) on delete restrict,
  model_key   text not null,              -- 網頁版的模型代號，例：m1
  name        text not null,
  data        jsonb not null,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now(),
  unique (office_id, model_key)
);
create index models_office_idx on public.models(office_id);

-- ---------- 事務所設定：本所案例、匯入的實價登錄、是否隱藏內建資料 ----------
create table public.office_settings (
  office_id   uuid primary key references public.offices(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- ---------- 操作紀錄：只能由系統寫入，使用者只能讀自己事務所的 ----------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  office_id   uuid not null references public.offices(id) on delete cascade,
  user_id     uuid,
  case_id     uuid,
  action      text not null,              -- insert / update / delete / sign
  detail      jsonb,
  at          timestamptz not null default now()
);
create index audit_log_office_at_idx on public.audit_log(office_id, at desc);

-- =====================================================================
-- 觸發器：自動填修改人與時間、保護已簽名案件、寫操作紀錄
-- =====================================================================
create or replace function private.stamp_row() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  if tg_op = 'INSERT' and tg_table_name = 'cases' then
    new.created_by := (select auth.uid());
  end if;
  return new;
end $$;

create trigger cases_stamp before insert or update on public.cases
  for each row execute function private.stamp_row();
create trigger models_stamp before insert or update on public.models
  for each row execute function private.stamp_row();
create trigger office_settings_stamp before insert or update on public.office_settings
  for each row execute function private.stamp_row();

-- 已簽名案件不能改、不能刪；只有估價師能把案件設為已簽名
create or replace function private.guard_case() returns trigger
  language plpgsql set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.signed then
    raise exception '已簽名的案件不能修改或刪除（案號 %）', old.case_no;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.signed and (select private.my_role()) is distinct from 'appraiser' then
    raise exception '只有估價師可以簽名';
  end if;
  if tg_op = 'UPDATE' and new.office_id <> old.office_id then
    raise exception '案件不能移到其他事務所';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger cases_guard before insert or update or delete on public.cases
  for each row execute function private.guard_case();

-- 操作紀錄（security definer：audit_log 不開放使用者直接寫入）
create or replace function private.log_case() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  r public.cases;
  act text := lower(tg_op);
begin
  if tg_op = 'DELETE' then
    r := old;
  else
    r := new;
    if tg_op = 'UPDATE' and new.signed and not old.signed then act := 'sign'; end if;
  end if;
  insert into public.audit_log(office_id, user_id, case_id, action, detail)
  values (r.office_id, (select auth.uid()), r.id, act, jsonb_build_object('case_no', r.case_no));
  return null;
end $$;
revoke all on function private.log_case() from public, anon, authenticated;

create trigger cases_log after insert or update or delete on public.cases
  for each row execute function private.log_case();

-- =====================================================================
-- 權限：開放給「已登入」角色，再用 RLS 限制只能碰自己事務所
-- （專案設定「不自動公開新資料表」，所以要明確 grant）
-- =====================================================================
alter table public.offices         enable row level security;
alter table public.members         enable row level security;
alter table public.cases           enable row level security;
alter table public.models          enable row level security;
alter table public.office_settings enable row level security;
alter table public.audit_log       enable row level security;

revoke all on public.offices, public.members, public.cases, public.models, public.office_settings, public.audit_log from anon;

grant select on public.offices, public.members, public.audit_log to authenticated;
grant select, insert, update, delete on public.cases, public.models to authenticated;
grant select, insert, update on public.office_settings to authenticated;

-- 事務所、成員：只能看自己事務所（不能新增或修改，由管理者在後台處理）
create policy offices_read on public.offices for select to authenticated
  using (id = (select private.my_office_id()));
create policy members_read on public.members for select to authenticated
  using (office_id = (select private.my_office_id()));

-- 案件、模型：自己事務所可讀寫
create policy cases_read   on public.cases for select to authenticated using (office_id = (select private.my_office_id()));
create policy cases_insert on public.cases for insert to authenticated with check (office_id = (select private.my_office_id()));
create policy cases_update on public.cases for update to authenticated
  using (office_id = (select private.my_office_id())) with check (office_id = (select private.my_office_id()));
create policy cases_delete on public.cases for delete to authenticated using (office_id = (select private.my_office_id()));

create policy models_read   on public.models for select to authenticated using (office_id = (select private.my_office_id()));
create policy models_insert on public.models for insert to authenticated with check (office_id = (select private.my_office_id()));
create policy models_update on public.models for update to authenticated
  using (office_id = (select private.my_office_id())) with check (office_id = (select private.my_office_id()));
create policy models_delete on public.models for delete to authenticated using (office_id = (select private.my_office_id()));

create policy settings_read   on public.office_settings for select to authenticated using (office_id = (select private.my_office_id()));
create policy settings_insert on public.office_settings for insert to authenticated with check (office_id = (select private.my_office_id()));
create policy settings_update on public.office_settings for update to authenticated
  using (office_id = (select private.my_office_id())) with check (office_id = (select private.my_office_id()));

create policy audit_read on public.audit_log for select to authenticated
  using (office_id = (select private.my_office_id()));

-- =====================================================================
-- keepalive：GitHub 排程每 3 天呼叫一次，避免免費專案 7 天沒用被暫停
-- 只回傳數字 1，不讀任何資料；未登入也可呼叫
-- =====================================================================
create or replace function public.keepalive() returns integer
  language sql stable security invoker set search_path = ''
as $$ select 1 $$;
revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
