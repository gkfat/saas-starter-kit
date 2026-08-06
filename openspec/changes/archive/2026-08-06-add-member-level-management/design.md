## Context

目前系統只有 `users` 模組管理會員身份資料，沒有任何反映會員長期價值的機制。本次新增獨立的 `level` 模組。此前已透過討論確立核心原則：`level` 與既有/規劃中的 `points` 模組完全解耦，互不相依,各自擁有獨立的 ledger、獨立的觸發來源；「誰觸發指標異動」「指標本身是什麼」都是外部呼叫端的關注點,不屬於 `level` 模組核心邏輯。

`level` 模組的核心定義：**在 `startDate` 與 `endDate` 之間，某個指標達到的數量級距**。指標本身在本次刻意保留（TODO），模組只提供中立的 `recordMetric(userId, amount, reason, source, refId)` 介面。

現有 repo 完全沒有任何後端排程/批次機制前例（無 Nitro `scheduledTasks`、無 cron 套件、無 GitHub Actions `schedule` trigger），本次會是第一個引入排程觸發模式的功能。

## Goals / Non-Goals

**Goals:**

- 定義等級模組的核心資料模型：當前週期狀態、指標異動明細、正式評等歷史、級距表
- 定義週期評等的完整生命週期：即時升級、到期批次降級/重新評等、週期歸零
- 定義到期批次評等的觸發機制與冪等性保證
- 提供 admin 後台的級距表管理 UI
- 整個模組（前後端）可透過 feature flag 整體開關

**Non-Goals:**

- 不定義指標本身的語意與計算來源（消費金額/次數/其他），由後續呼叫端決定
- 不支援管理員手動覆蓋等級
- 不處理 `points` 模組的實作（僅確保架構上與其解耦）
- 不做等級變更的通知/webhook 機制

## Decisions

### 1. 週期為依會員 `createdAt` 各自獨立起算的固定週期（週年制），非全站統一日曆年

理由：公平性——避免年末加入的會員被迫用極短時間累積指標；批次寫入天然分散在每天，不會有全站集中評等造成的 Firestore 尖峰負載。

替代方案：全站統一日曆年週期。優點是心智模型單純、批次時間單一；捨棄原因是對後期加入會員不公平，且集中批次有負載風險。

### 2. 週期到期時累積指標完全歸零（hard reset），不做部分保留/衰減

理由：最單純、不需要額外商業規則（衰減比例、適用範圍等），符合系統目前「先求簡單可行」的階段。

替代方案：門檻減半保留（類似航空哩程保級）。捨棄原因是這類規則在沒有實際商家需求驗證前屬於過早的複雜度。

### 3. 週期中即時升級，降級僅發生在週期到期的正式評等

理由：航空/飯店會員制常見模式,對會員體驗友善(升等即時感受到,不會因短期波動被降級)。搭配決策 2（指標只增不減、僅在週期邊界歸零),即時升級的結果與週期末正式評等結果天然一致,不需要額外規則處理「升級後又不達標」的情境。

因此升級不影響 `startDate`/`endDate`——週期邊界維持原訂排程。

### 4. 指標記錄採用 ledger（異動明細）+ denormalized 累積總數欄位

仿照現有 `point_transactions`/`audit_logs` 的 pattern,記錄 `amount`、`reason`、`source`、`refId`、`occurredAt`。

理由：架構一致性（與 `logs` 模組、規劃中的 `points` 模組手法一致）；可稽核性（爭議發生時可回溯每筆異動的來源與原因,單一 counter 無法做到）；未來指標計算規則調整時可重新推算,不會因為只有一個累加數字而無法訂正。denormalized 總數欄位純粹是讀取效能優化,不影響核心資料完整性(ledger 是 source of truth)。

### 5. 級距表存於 Firestore,後台提供完整編輯 UI,且每次評等時存快照到 `level_history`

理由：商家自助調整等級名稱/門檻是產品定位的核心賣點(呼應 target.md「不用重新建立另一套系統」)。評等結果連同當下使用的級距表存快照,避免商家事後調整門檻導致歷史紀錄失真——`level_history` 是不可變的歷史記錄,不隨 `level_tiers` 當前設定重新解讀。

### 6. 最低等級恆定存在,`levelNumber` 從 1 起算,對應指標門檻從 0 起算(兩者為獨立概念)

理由：所有會員從加入起就有一個有效等級,前端顯示邏輯不需處理 null 特例;升級判斷式不需要處理「從 null 升級」的邊界情況。`levelNumber` 從 1 起算是商業展示慣例(對應「一級會員」而非「零級會員」),與指標門檻從 0 起算(涵蓋所有累積值)是兩個不同用途的欄位,不可混用。

驗證規則：`level_tiers` 中 `levelNumber = 1` 的資料列,其指標門檻必須為 0,確保所有可能的累積值都落在某個等級區間內。

### 7. 到期批次評等透過 GCP Cloud Scheduler 呼叫受保護的 internal API endpoint 觸發,不使用內建排程

理由：repo 目前無任何排程前例,且不確定正式環境(目前 Firebase App Hosting,未來可能遷移 Cloud Run)是否支援常駐排程進程。使用外部排程器呼叫 HTTP endpoint 的方式,對部署環境沒有假設,且符合「evaluation 邏輯是 service 責任、排程是 infra 關注點」的分離原則,與現有 `api/` thin handler 模式一致。

替代方案：Nitro `scheduledTasks`。捨棄原因是依賴常駐進程,在尚未確認部署環境是否支援的情況下風險較高。

### 8. Internal endpoint 以共享密鑰(shared secret header)驗證,不採用 GCP OIDC token 驗證

理由：與現有 `FIREBASE_*` 服務帳號憑證的風險管理方式一致(環境變數存密鑰);內部低頻批次操作,不需要引入額外的 OIDC 驗證函式庫與時鐘偏移處理邏輯;攻擊面小(endpoint 不對外曝光於任何前端/API 文件)。

### 9. 冪等性以 `endDate <= today` 查詢條件本身作為天然冪等鎖,評等結果寫入與週期更新包在同一個 Firestore transaction

理由：週期是依會員各自獨立起算(決策 1),天然以單一會員的 `endDate` 狀態為判斷單位,不需要額外的「批次執行紀錄」collection。查詢條件本身在處理完後失去成立性,重複呼叫自然跳過已處理會員;transaction 確保「評等寫入 + 週期更新 + 累積值歸零」是原子操作,避免中途失敗留下不一致的孤兒記錄。

### 10. 不支援管理員手動覆蓋等級

理由：手動覆蓋本質上是在說「有時候等級不是指標的級距」,牴觸模組的核心定義,且需要額外的「來源是計算還是手動」欄位與優先順序仲裁邏輯,屬於還沒被真實需求驗證的複雜度。若未來有需求,應是獨立 change,不在本次範圍內預先開放。

### 11. 會員初始化由 `users.service.ts` 在 `registerUserWithProvider()` 內顯式呼叫 `level.initializeMemberPeriod(userId, createdAt)`

比照現有 `bindProvider`（identity 模組）、`assignUserRole`（roles 模組）的呼叫模式——本 repo 目前沒有 event/hook/pub-sub 機制,跨模組觸發一律是呼叫端直接 import 目標模組 `index.ts` 匯出函式並同步呼叫。

理由：確保每個會員從註冊那一刻起就有有效的 period state,錨定在真正的註冊時間,`getLevel`/`recordMetric` 不需處理「state 不存在」的邊界情況。

**此呼叫不受 `FEATURE_LEVEL_ENABLED` 判斷影響,一律執行**——只有 `recordMetric`/`evaluateDuePeriods`/admin UI 等「功能性行為」才受 flag 控制,「等級狀態是否存在」與「等級功能是否啟用」是兩個獨立關注點。理由：若 init 也被 flag 擋住,會產生一個「flag 關閉期間註冊的會員永遠沒有 period state」的資料缺口,未來開啟 flag 時需要額外的 backfill 機制才能補齊決策 6「所有會員永遠有一個有效等級」的不變量;讓 init 一律執行可以完全消除這個缺口,不需要 backfill 邏輯,呼叫端(users.service.ts)也不需要感知 flag 細節。

替代方案：lazy-init(`getLevel`/`recordMetric` 第一次呼叫時就地建立)。捨棄原因是週期起點會失真(等於「第一次被呼叫的時間」而非真正註冊時間),且需要呼叫端自行傳入正確的 `createdAt`,容易不一致。

**已知風險**：`registerUserWithProvider()` 目前 `bindProvider`/`createUser`/`assignUserRole` 三步之間沒有 transaction,任一步失敗都會留下沒有清理機制的半成品帳號(詳見 [`docs/known-issues.md`](../../../docs/known-issues.md))。`level.initializeMemberPeriod` 失敗時比照現有 `assignUserRole` 失敗的處理方式,讓整支註冊 API 回錯誤——這會觸發與既有問題完全相同的半成品帳號情境,不是本次新增的風險類別,故不在本次範圍內修復,僅新增一個觸發點。`level.initializeMemberPeriod` 本身(單筆文件寫入)天生原子,不需要額外 transaction 設計。

**既有會員 backfill**：本 change 開發當下平台僅有測試資料、無正式既有會員,故不需要 backfill 既有會員的 period state。若未來在已有正式會員資料的環境重新導入類似機制(例如 `level` 模組程式碼上線前就已存在的會員),才需要評估一次性 backfill 腳本,不在本次範圍內處理。

### 12. `recordMetric` 的 `amount` 強制驗證為非負數

理由：決策 2(週期到期 hard reset 歸零)與決策 3(即時升級、僅期末降級)的正確性,前提是累積指標在單一週期內只增不減。這是 `level` 模組**結構性**要求(維持核心邏輯自洽),不是「指標語意」的限制,故不牴觸 Non-Goals「指標語意留給呼叫端決定」的範圍切分。在 `level.schema.ts` 用 Zod 約束 `amount >= 0`,呼叫端傳入負值時直接拒絕。

替代方案：允許負數但規定「等級一旦上升不因後續 total 下降而回撤」。捨棄原因是需要額外文件化的邊界規則,且扣減/退款類需求本質上是指標語意,應留給後續 change 決定要不要支援與如何支援。

### 13. 刪除 tier 前檢查是否有會員的 `currentLevelNumber` 指向該 tier,若有則拒絕刪除

理由：保證決策 6「所有會員永遠有一個有效等級」的不變量在任何時間點都成立,不需要額外欄位(如 soft delete 狀態)或等級漂移邏輯。屬於低頻 admin 操作,一次性參照查詢的成本可接受。

替代方案：允許刪除、`getLevel` fallback 到最接近的較低可用等級。捨棄原因是這其實是變相的 mid-period 降級,違反決策 3,且需要額外定義「最接近」的比較邏輯。

### 14. 到期批次評等以 100 筆為一頁,單次呼叫內迴圈處理完所有到期會員;單一會員處理失敗記錄 log 後 continue,不中斷整批

理由：無上限的單次查詢+逐筆 transaction 有 serverless 平台 request timeout 風險;但要在此次呼叫內清空所有到期會員(而非留到下次排程),避免長期不活躍造成的積壓被無限拖延。分頁大小(100)是在「單次 transaction 負載」與「處理效率」間的簡單折衷值,非效能實測結果。

單一會員失敗若讓整批中斷(拋出到最外層),配合冪等設計(決策 9,查詢按 `endDate` 由舊到新)會形成 poison-pill——排在最前面的壞資料每次重試都會擋住它後面所有正常到期會員的評等。故改為 per-member try/catch,失敗案例比照 CLAUDE.md 既有規範以 structured log 記錄(`userId`、錯誤原因),不寫入 Firestore;endpoint 回應包含 `{ processed, failed, failedUserIds }` 摘要。

### 15. `level_history` 的期末評等結果直接採用會員 period state 當下的 `currentLevelNumber`,不重新依 `currentPeriodTotal` 對照 `level_tiers` 計算比對

理由：`currentLevelNumber` 已經由 mid-period 即時升級邏輯(決策 3)持續維護到最新,且決策 2/3/12(hard reset 歸零、只增不減、即時升級)共同保證兩者理論上必然一致,直接信任已維護欄位是最簡單的作法。

替代方案：期末評等時重新計算並與 `currentLevelNumber` 比對,不一致視為資料異常。捨棄原因是多一層複雜度,且目前沒有實際證據顯示 denormalized 欄位會跑掉;若之後真的發現不一致的案例,再考慮加回這層防呆。

## Risks / Trade-offs

- **[風險] 週期歸零可能造成會員體驗上的「一夕掉回原點」** → 緩解：本次先求資料模型單純,若商家反應體驗不佳,可在後續 change 加入部分保留/衰減規則,不影響本次已定義的核心資料結構
- **[風險] 依會員各自起算的週期,批次查詢需要對 `endDate` 欄位建立索引,會員數成長後查詢效能需留意** → 緩解：`endDate` 為單一等值/範圍查詢欄位,Firestore 原生支援單欄位索引;查詢本身另以 100 筆分頁+單次呼叫內迴圈清空的方式處理(決策 14),避免無上限查詢造成單次呼叫 timeout
- **[風險] 會員註冊流程既有的非原子性問題(詳見 [`docs/known-issues.md`](../../../docs/known-issues.md)),`level.initializeMemberPeriod` 失敗會觸發相同的半成品帳號情境** → 緩解：本次不修復此既有缺陷(範圍過大,需調整 `identity`/`users`/`roles` 三個既有模組的寫入介面),僅記錄為已知限制,建議另立 change 處理(決策 11)
- **[已知未來擴充點] `level_metric_entries` ledger 為 append-only,本次未規劃 TTL/歸檔/清理機制,高頻指標情境下會無上限成長** → 緩解：比照既有 `logs` 模組(`login_logs`/`audit_logs`)現況,兩者目前共享同一個治理缺口;本次不處理,待實際出現資料量問題時再開獨立 change 設計治理策略(TTL policy、封存等)
- **[風險] 共享密鑰若外洩,internal endpoint 可能被濫用觸發批次評等** → 緩解：批次評等邏輯本身具冪等性(決策 9),重複觸發不會造成資料錯誤,僅造成不必要的運算成本;密鑰比照現有服務帳號憑證的保管規範
- **[風險] 指標本身未定案,呼叫端在指標語意確定前無法真正串接 `recordMetric()`** → 緩解：這是刻意的範圍切分(見 Non-Goals),本次交付的是可獨立驗證的資料模型與批次機制,指標串接留待後續 change,不阻塞本次模組上線
- **[取捨] Ledger + denormalized 總數雙寫,需確保兩者一致性** → 緩解：比照 `points` 模組規劃中的作法,寫入 ledger 與更新 denormalized 總數應在同一 Firestore transaction 內完成

## Migration Plan

- 全新模組,無既有資料需要遷移
- 部署順序：先部署 `level` 模組程式碼(feature flag 預設關閉)→ 設定 GCP Cloud Scheduler 與共享密鑰環境變數 → 後台驗證級距表管理 UI → 開啟 feature flag
- Rollback：關閉 feature flag 即可讓模組整體停用(前後端),不影響其他既有模組;Firestore collections 為新增,關閉 flag 不需要清除資料

## Open Questions

- 指標本身的定義(消費金額/次數/其他)與呼叫端串接時機,待後續 change 決定
- `level_tiers` 級距表是否需要支援「多組級距表併存」(例如不同會員分群適用不同級距),本次先假設全站單一級距表,若商家有分群需求需另行評估
