**Problem:** 舊版 RLS 讓事務所任何成員（包含 manager 與 assistant）都可以新增、修改、刪除估價模型與事務所設定；併發保護靠比對 updated_at 時間戳，不是版本號。

**Context:** 出處：supabase/001_init.sql 的 models_* 與 settings_* policies，只檢查 office_id；沒有像 cases 那樣的 guard 觸發器。併發：core/cloud.js cloudPush 以 .eq('updated_at', CLOUD_MVER[id]) 做條件更新，資料庫端是原子的，但沒有 version 欄位，也沒有稽核（log_case 只掛在 cases）。steering 要求：模型、設定都有版本號；身分規則在 Service 層。誰能改模型是產品規則，見問題 model-settings-permissions。

**Suggested next step:** 新版 models 與 office_settings 一開始就有整數 version 欄位與 Service 層身分檢查；測試每個寫入入口的拒絕案例（別的事務所、身分不符、版本衝突）。是否為模型與設定寫稽核，與使用者確認。

**Why deferrable:** 屬於既有舊版程式的歷史問題，不是新版這輪的工作；新版節點的完成訊號不依賴它，但移植時不可把它帶過去。範圍小於一整個節點，不值得獨立 spec。
