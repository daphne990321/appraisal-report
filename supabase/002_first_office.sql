-- =====================================================================
-- P2-3 建立第一家事務所，並把管理者帳號設為該事務所的估價師
-- 用法：先在 Authentication → Users 建立帳號（勾 Auto Confirm User），
--       再到 SQL Editor 貼上全部 → Run。只需執行一次。
-- 之後要加新事務所或新成員，複製這份、改名稱與 Email 再執行即可。
-- =====================================================================
do $$
declare
  v_email  text := 'daphne990321@gmail.com';
  v_office text := '靈嶼測試事務所';
  v_user   uuid;
  v_off    uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(v_email);
  if v_user is null then
    raise exception '找不到帳號 %，請先到 Authentication → Users 建立', v_email;
  end if;

  select id into v_off from public.offices where name = v_office;
  if v_off is null then
    insert into public.offices(name) values (v_office) returning id into v_off;
  end if;

  insert into public.members(user_id, office_id, role)
  values (v_user, v_off, 'appraiser')
  on conflict (user_id) do update set office_id = excluded.office_id, role = excluded.role;

  raise notice '完成：% 已加入「%」，身分：估價師', v_email, v_office;
end $$;

-- 確認結果
select o.name as 事務所, u.email, m.role as 身分
from public.members m
join public.offices o on o.id = m.office_id
join auth.users u on u.id = m.user_id;
