-- =====================================================================
-- P3-4 補授權：讓同步程式（GitHub 排程用的 secret key，資料庫角色 service_role）可以寫入實價登錄
-- 原因：專案設定「不自動公開新資料表」，新表連 service_role 也沒有預設權限
-- 用法：Supabase 後台 → SQL Editor → 貼上全部 → Run。只需執行一次。
-- 網頁使用者（authenticated）仍然只能讀；未登入者（anon）仍然什麼都不能碰。
-- =====================================================================
grant select, insert, update, delete on public.lvr_records  to service_role;
grant select, insert                 on public.lvr_sync_log to service_role;
