## 1. Shared types & Feature Flag

- [x] 1.1 在 `packages/shared/dto/points.ts` 新增 `PointsSettings`、`PointsMemberState`、`PointsLedgerEntry`、`PointsAdjustReason` 型別與 zod schema
- [x] 1.2 擴充 `FeatureFlag` enum 新增 `Points`，並在 runtime config（`FEATURE_POINTS_ENABLED`）接上，比照 `auditLog`/`loginLog` 既有寫法

## 2. Server: points module 基礎建設

- [x] 2.1 建立 `apps/server/server/modules/points/` 目錄結構（`points.repo.ts` / `points.service.ts` / `points.schema.ts` / `points.types.ts` / `index.ts`）
- [x] 2.2 `points.repo.ts`：實作 `points_settings` 讀寫（`getSettings` / `updateSettings`）
- [x] 2.3 `points.repo.ts`：實作 `points_member_states` 讀取（`getMemberState`）
- [x] 2.4 `points.repo.ts`：實作 `recordPointsAdjustmentTransaction`（Firestore transaction：讀取目前餘額 → 檢查扣點後是否為負 → 寫入 ledger entry → 更新 `balance`）
- [x] 2.5 `points.repo.ts`：實作 `listLedgerEntriesForMember`（依 `createdAt` 倒序）
- [x] 2.6 `points.service.ts`：實作業務邏輯（呼叫 repo、驗證 reason=`其他`時 note 必填、計算可兌換金額 `floor(points / pointsPerUnit) * currencyValue`）
- [x] 2.7 `points.schema.ts`：定義 API request/response 的 zod schema（設定更新、增減點數）

## 3. Server: API routes

- [x] 3.1 新增 `GET /api/admin/points/settings`、`PUT /api/admin/points/settings`（需權限 + `points` flag 檢查）
- [x] 3.2 新增 `GET /api/admin/points/members`（會員點數列表，支援搜尋，僅列出 role=member）
- [x] 3.3 新增 `GET /api/admin/points/members/:userId`（單一會員餘額 + ledger）
- [x] 3.4 新增 `POST /api/admin/points/members/:userId/adjust`（增減點數，帶 reason/reasonNote）
- [x] 3.5 新增 `GET /api/profile/points`（LIFF 會員取得自己的點數餘額與可兌換金額；比照既有 `profile/level.get.ts`、`profile/coupons.get.ts` 命名慣例，而非提案草稿中的 `/api/points/me`）
- [x] 3.6 新增 `GET /api/profile/points/ledger`（LIFF 會員取得自己的點數異動紀錄）
- [x] 3.7 所有上述路由在 handler 開頭檢查 `points` feature flag，停用時回傳功能停用錯誤

## 4. Admin: 折抵比例設定頁

- [x] 4.1 新增 `apps/admin/pages/admin/points/settings.vue`（顯示/編輯 `pointsPerUnit`、`currencyValue`）
- [x] 4.2 在 `config/app-routes.ts` 新增「會員點數」導覽項目，受 `points` flag 控制（此專案導覽項目與路由守衛皆由 `app-routes.ts` 集中設定驅動 `AppDrawer.vue`/`middleware/auth.global.ts`，不需直接編輯 `AppDrawer.vue`）

## 5. Admin: 會員點數列表與操作 Dialog

- [x] 5.1 新增 `apps/admin/pages/admin/points/members.vue`（會員點數列表頁，搜尋，參考 `UsersTable.vue`/`FilterBar` 寫法）
- [x] 5.2 新增 `apps/admin/components/points/MemberPointsDialog.vue`：上半部增減點數表單（金額、reason select、reason=`其他`時顯示必填 note 欄位、送出前顯示異動後餘額預覽）
- [x] 5.3 `MemberPointsDialog.vue` 下半部：ledger 明細列表（`v-data-table`，參考 `InstancesDialog.vue` 寫法）
- [x] 5.4 表單送出後呼叫 `POST /api/admin/points/members/:userId/adjust`，`useApi` 的 `apiFetch` 已統一以 toast 呈現伺服器錯誤訊息（含扣點超額的 400 錯誤）

## 6. LIFF: 會員卡整合點數顯示

- [x] 6.1 修改 `apps/liff/src/components/member/MemberCard.vue`，新增點數餘額顯示區塊（呼叫 `GET /api/profile/points`）
- [x] 6.2 flag 關閉時 API 回傳功能停用錯誤，沿用既有等級卡片的 try/catch 靜默略過模式隱藏點數區塊

## 7. LIFF: 掃碼頁改為獨立頁面

- [x] 7.1 在 `apps/liff/src/router.ts` 的 `MemberLayout` children 新增 `member-card` route
- [x] 7.2 新增 `apps/liff/src/pages/member-card/index.vue`：呈現 QR code（沿用現有 `qrcode` 套件產生邏輯）、目前點數、換算可兌換金額（唯讀，不含等級資訊）
- [x] 7.3 移除 `apps/liff/src/components/AppHeader.vue` 中的 QR dialog 邏輯，改為導頁至新頁面；並在 `AppDrawer.vue` 新增「會員條碼」入口

## 8. LIFF: 點數異動紀錄頁

- [x] 8.1 在 `router.ts` 新增 `points` route，新增 `apps/liff/src/pages/points/index.vue`（列表，呼叫 `GET /api/profile/points/ledger`，含空狀態呈現）
- [x] 8.2 在 `apps/liff/src/pages/member-center/index.vue` 新增「點數紀錄」入口連結；flag 關閉時目標頁面 API 回傳錯誤，與既有 coupons 頁一致採統一錯誤呈現而非入口隱藏

## 9. 驗證

- [x] 9.1 執行 `pnpm lint`、`pnpm build`：全數通過。`pnpm --dir apps/server test`：8 個測試檔中 3 個測試失敗（`change-password.test.ts`、`level.test.ts`、`rbac.test.ts`），皆與本次改動的模組無關（未修改任何相關檔案），失敗原因為這些整合測試依賴對真實 Firebase 專案執行 `pnpm dev:server` 的環境與殘留測試資料狀態（例如等級門檻重複導致 409、user_auth 已存在導致 400），非本次 points 功能造成的迴歸
- [ ] 9.2 手動驗證：後台設定折抵比例 → 手動增減會員點數（含「其他」原因必填 note 驗證、扣點超額被拒絕）→ 查看 ledger（尚待人工於瀏覽器操作驗證，本次實作階段未執行）
- [ ] 9.3 手動驗證：LIFF 會員卡顯示點數 → 掃碼頁顯示點數與可兌換金額 → 點數紀錄頁列表與空狀態（尚待人工於瀏覽器操作驗證，本次實作階段未執行）
- [ ] 9.4 手動驗證：關閉 `FEATURE_POINTS_ENABLED` 後，後台導覽項目、LIFF 入口/頁面皆隱藏，直接導航頁面被導離，相關 API 回傳功能停用錯誤（尚待人工於瀏覽器操作驗證，本次實作階段未執行）
