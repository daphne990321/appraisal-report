**Problem:** supabase 目錄的 SQL 檔含個人 email：002_first_office.sql、003_isolation_test.sql、007_case_mgmt_test.sql。

**Context:** 出處：supabase/002_first_office.sql（v_email）、003_isolation_test.sql 第 17 行（含 +test-b 測試帳號）、007_case_mgmt_test.sql 第 17–18 行。目錄會在 legacy-retire 整個刪除，但 git 歷史仍保留。AGENTS.md 允許改寫歷史（git filter-repo）且事後只需通知。

**Suggested next step:** legacy-retire 移除 supabase/ 之後，用 git filter-repo 從全部歷史移除這 3 個檔案（或替換 email），force push，並把新舊 hash 對照與 git rebase --onto 指令交給其他分支。若 legacy 在公開 repo 上，先確認 email 是否已被複製到別處。

**Why deferrable:** 節點 legacy-retire 排在最後；目錄被刪除前沒有新增的曝光，歷史改寫要在遷移完成後一起做。
