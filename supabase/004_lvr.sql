-- =====================================================================
-- P3-2 實價登錄資料表（所有事務所共用的公開資料）
-- 用法：Supabase 後台 → SQL Editor → 貼上全部 → Run。只需執行一次。
--
-- 設計
-- 1. 一張表放買賣（A）、預售屋（B）、租賃（C）；kind 區分 sale／landsale／rent
-- 2. 主鍵用內政部的「編號」，重複下載同一筆只會存一份
-- 3. 拆成一般欄位存（不存整筆 JSON），3 個縣市 3 年約 160～220 MB，在免費 500 MB 內
-- 4. 已登入的使用者都能讀；沒有人能從網頁寫入，只有同步程式（GitHub 排程，用 secret key）能寫
-- 5. 欄位對應 core/model.js importLvr 的輸出（括號內為對應的 JS 欄位名）
-- =====================================================================

create table public.lvr_records (
  serial         text primary key,          -- 內政部編號
  cat            char(1) not null check (cat in ('A','B','C')),  -- A 買賣、B 預售屋、C 租賃
  season         text not null,             -- 來自哪一季的檔案，例：115S2
  county         text not null,             -- 縣市（county）
  district       text,                      -- 鄉鎮市區（district）
  kind           text not null check (kind in ('sale','landsale','rent')),
  type           text,                      -- 建物型態（type）
  zone           text,                      -- 使用分區（zone）
  ym             text not null,             -- 交易或租賃年月 YYYY-MM（date）
  floor_num      smallint,                  -- 移轉／租賃層次（floorNum）
  total_floors   smallint,                  -- 總樓層數（totalFloors）
  completed      text,                      -- 建築完成年月（completed）
  age            smallint,                  -- 屋齡（age，空白為 null）
  area_ping      numeric(12,2),             -- 面積坪（areaPing）
  unit_wan       numeric(12,2),             -- 單價萬元／坪（unitWan，買賣）
  total_wan      integer,                   -- 總價萬元（totalWan，買賣）
  rent_total     integer,                   -- 月租金元（rentTotal，租賃）
  rent_per_ping  integer,                   -- 每坪月租金元（rentPerPing，租賃）
  park           boolean,                   -- 含車位（park）
  presale        boolean,                   -- 預售屋（presale）
  elevator       boolean,                   -- 有電梯（elevator）
  mgmt           boolean,                   -- 有管理組織（mgmt）
  furnished      boolean,                   -- 附傢俱（furnished，租賃）
  lease          text,                      -- 出租型態（lease，租賃）
  special        text,                      -- 特殊交易分類（special）
  note           text,                      -- 備註（note，空白存 null）
  addr           text,                      -- 土地位置建物門牌（addr，內政部已去識別化）
  road           text                       -- 路街（road）
);

-- 挑比較標的時依「縣市＋鄉鎮市區＋年月」與「縣市＋類別＋年月」查詢
create index lvr_records_area_idx on public.lvr_records (county, district, ym);
create index lvr_records_kind_idx on public.lvr_records (county, kind, ym);

-- 同步紀錄：每次下載每個檔案一列
create table public.lvr_sync_log (
  id          bigint generated always as identity primary key,
  season      text not null,
  county      text not null,
  cat         char(1) not null,
  rows_parsed integer,
  rows_saved  integer,
  ok          boolean not null,
  message     text,
  at          timestamptz not null default now()
);
create index lvr_sync_log_at_idx on public.lvr_sync_log (at desc);

-- ---------- 權限：已登入者只能讀；不給任何人寫入權限（同步程式用 secret key，不受此限制） ----------
alter table public.lvr_records  enable row level security;
alter table public.lvr_sync_log enable row level security;
revoke all on public.lvr_records, public.lvr_sync_log from anon, authenticated;
grant select on public.lvr_records, public.lvr_sync_log to authenticated;
create policy lvr_read      on public.lvr_records  for select to authenticated using (true);
create policy lvr_log_read  on public.lvr_sync_log for select to authenticated using (true);

-- ---------- 用量檢查（管理者在 SQL Editor 執行）：每縣市筆數與資料表大小 ----------
-- select county, cat, count(*) from public.lvr_records group by 1,2 order by 1,2;
-- select pg_size_pretty(pg_total_relation_size('public.lvr_records')) as 實價登錄資料表大小,
--        pg_size_pretty(pg_database_size(current_database()))        as 整個資料庫大小;
