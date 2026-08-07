## 1. Shared 型別與權限

- [x] 1.1 `packages/shared/dto/` 新增 `coupons.ts`：`CouponTemplate`（id, title, description, discountType, discountValue?, validDays, status, createdAt, updatedAt）與 `CouponInstance`（id, templateId, memberId, code, issuedAt, issuedBy, expiresAt, redeemedAt?, redeemedBy?）型別
- [x] 1.2 `packages/shared/permissions.ts` 新增 `Coupons: { Read, Write, Issue, Redeem }` 及對應 `PermissionMeta`
- [x] 1.3 `packages/shared/feature-flags.ts` 新增 `FeatureFlag.Coupon`
- [x] 1.4 更新角色權限 seed／設定，決定預設哪些角色擁有 `coupons:*`

## 2. Server：coupons 模組

- [x] 2.1 新增 `server/modules/coupons/coupons.schema.ts`（Zod schema：範本建立/更新、發放、核銷、查詢參數）
- [x] 2.2 新增 `server/modules/coupons/coupons.repo.ts`：`coupon_templates`、`coupon_instances` 兩個 collection 的 CRUD（比照 `level.repo.ts` 使用 `prefixCollection`），含核銷用的 Firestore transaction 讀寫方法
- [x] 2.3 新增 `server/modules/coupons/coupons.service.ts`：範本狀態轉換驗證（`draft`/`published`/`disabled`）、發放邏輯（產生唯一 `code`、計算 `expiresAt`）、核銷邏輯（transaction 內檢查 `redeemedAt`/`expiresAt`）、會員優惠券清單查詢與狀態分類
- [x] 2.4 新增 `server/modules/coupons/coupons.types.ts`（內部型別）
- [x] 2.5 新增 `server/modules/coupons/index.ts`（對外匯出）

## 3. Server：Admin API

- [x] 3.1 新增 `api/admin/coupons/index.get.ts`（範本列表，需 `coupons:read`）
- [x] 3.2 新增 `api/admin/coupons/index.post.ts`（建立範本，需 `coupons:write`，寫入 `audit_logs`）
- [x] 3.3 新增 `api/admin/coupons/[id].patch.ts`（編輯範本／狀態切換，需 `coupons:write`，寫入 `audit_logs`）
- [x] 3.4 新增 `api/admin/coupons/[id]/issue.post.ts`（批次發放給指定會員清單，需 `coupons:issue`，寫入 `audit_logs`）
- [x] 3.5 新增 `api/admin/coupons/[id]/instances.get.ts`（該範本發放紀錄，需 `coupons:read`）
- [x] 3.6 新增 `api/admin/coupons/redeem.post.ts`（依序號核銷，需 `coupons:redeem`，寫入 `audit_logs`）

## 4. Server：LIFF 公開 API

- [x] 4.1 新增 `api/liff/coupons/index.get.ts`（會員自己持有的優惠券清單，含可使用/已使用/已過期分類，需登入態）
- [x] 4.2 新增 `api/liff/coupons/[id].get.ts`（優惠券詳情，僅能查詢自己持有的券，需登入態）

## 5. Admin 前端

- [x] 5.1 新增 `pages/admin/coupons/index.vue`（範本列表，顯示 `status`、可執行編輯/發放/查看發放紀錄操作）
- [x] 5.2 新增範本建立/編輯表單（`title`、`description`、`discountType`、`discountValue`、`validDays`、`status` 切換）
- [x] 5.3 新增「發放」dialog：內嵌會員 table + filter（搜尋姓名/會員編號/電話等，可參考 `pages/admin/members` 既有列表/篩選實作），支援勾選單一或多位會員後送出批次發放
- [x] 5.4 新增「發放紀錄」檢視（依範本查詢 `coupon_instances`，顯示會員、發放時間、核銷狀態）
- [x] 5.5 新增「核銷」頁面：序號輸入框 + 送出核銷，顯示核銷結果（成功/已使用/已過期/查無序號）
- [x] 5.6 新增對應 composable/API client（比照既有模組 pattern）
- [x] 5.7 導覽選單（`AppDrawer`）新增「優惠券管理」項目，依 `coupons:read` 權限顯示

## 6. LIFF 前端

- [x] 6.1 新增優惠券 API client（呼叫 `/api/liff/coupons`、`/api/liff/coupons/[id]`）
- [x] 6.2 首頁新增「優惠券」卡片（col 6），顯示可使用數量，點擊導向優惠券列表頁
- [x] 6.3 新增「我的優惠券」列表頁：分類顯示可使用/已使用/已過期
- [x] 6.4 新增優惠券詳情頁：標題、說明、到期日、序號，並用既有 `qrcode` 套件將序號轉為 QR code 呈現

## 7. 測試與驗證

- [x] 7.1 `coupons.service.ts` 範本狀態轉換規則單元測試（僅 `published` 可發放、`disabled` 不影響既有券）
- [x] 7.2 發放邏輯測試（批次發放產生正確數量的獨立 `coupon_instances`、`expiresAt` 計算正確、同會員可重複發放）
- [x] 7.3 核銷邏輯測試（成功核銷、已核銷拒絕、已過期拒絕、查無序號回 404）
- [x] 7.4 核銷並發測試（同一序號同時送出兩次核銷請求，僅一次成功）
- [x] 7.5 Admin API 權限檢查測試（`coupons:read`/`write`/`issue`/`redeem` 各自無權限應被拒絕）
- [x] 7.6 LIFF API 未登入應被拒絕測試；查詢非自己持有的優惠券應被拒絕測試
- [x] 7.7 `pnpm build`、`pnpm lint`、`pnpm test` 全數通過
- [x] 7.8 手動驗證：admin 建立並發行範本 → 發放給會員 → LIFF 端看到卡片數量與詳情 QR code → admin 核銷頁輸入序號完成核銷 → LIFF 端該券變為已使用
