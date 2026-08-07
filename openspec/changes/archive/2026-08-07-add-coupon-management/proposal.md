## Why

系統目前沒有任何優惠券機制。行銷/營運需要能建立優惠券範本，手動發放給指定會員，讓會員在 LIFF 端持有並於到店消費時出示核銷，藉此提升會員黏著度與回購率。這是產品定位（會員經營平台）明列的核心功能之一，也是後續「點數兌換優惠券」功能的前置依賴。

## What Changes

- 新增 admin 後台「優惠券管理」頁面：建立/編輯優惠券範本（標題、說明、折扣類型、折扣值、有效天數），並管理範本狀態（草稿/已發行/停用）
- 新增「發放」操作：管理員針對已發行範本開啟會員選擇 dialog（內嵌會員 table + filter），可勾選單一或多位會員批次發放，同一會員可被重複發放同一範本
- 新增「發放紀錄」檢視：查看某範本歷來已發放的所有優惠券實例與其核銷狀態
- 新增「核銷」頁面：店家人員手動輸入優惠券序號，透過 Firestore transaction 完成核銷，防止並發重複核銷
- 新增 `modules/coupons`（server）：`coupon_templates` 與 `coupon_instances` 的 CRUD/發放/核銷 service/repo，供 admin API 與 liff 公開 API 共用
- 新增 admin API：`/api/admin/coupons`（範本 CRUD）、`/api/admin/coupons/[id]/issue`（發放）、`/api/admin/coupons/[id]/instances`（發放紀錄）、`/api/admin/coupons/redeem`（核銷）
- 新增 liff 公開 API：`/api/liff/coupons`（會員持有的優惠券清單，含可使用/已使用/已過期分類）、`/api/liff/coupons/[id]`（優惠券詳情，含序號供 QR code 顯示）
- 新增 liff 頁面：首頁新增「優惠券」卡片（顯示可使用數量），新增「我的優惠券」列表頁與詳情頁（顯示 QR code、序號、說明、到期日）
- 優惠券範本/發放/核銷等異動動作皆寫入 `audit_logs`（沿用 `modules/logs`，比照 `users`、`level/tiers` 既有慣例）
- 新增 `FeatureFlag.Coupon` 控制整個優惠券模組（含 LIFF 端）是否啟用

## Capabilities

### New Capabilities

- `coupon-management`：管理員在後台建立/編輯優惠券範本、切換範本狀態、批次發放給指定會員、查看發放紀錄
- `coupon-redemption`：店家人員在後台輸入序號核銷優惠券，含並發防護
- `coupon-wallet-liff`：LIFF 端會員查看自己持有的優惠券清單與詳情（含 QR code）

### Modified Capabilities

（無現有 capability 的需求變更）

## Impact

- **apps/server**: 新增 `server/modules/coupons/`（schema/service/repo/index）、`server/api/admin/coupons/*`、`server/api/liff/coupons/*`
- **apps/admin**: 新增 `pages/admin/coupons/`（範本列表、建立/編輯表單、發放 dialog 含會員選擇 table+filter、發放紀錄檢視、核銷頁面）、對應 composable/API client
- **apps/liff**: 首頁新增優惠券卡片；新增「我的優惠券」列表頁與詳情頁；對應 API client
- **packages/shared**: 新增 `CouponTemplate` / `CouponInstance` DTO/型別、`Coupons: { Read, Write, Issue, Redeem }` permission 常數、`FeatureFlag.Coupon`
- **RBAC**: 新增 `coupons:read`、`coupons:write`、`coupons:issue`、`coupons:redeem` 權限，需納入角色權限設定
- **Firestore**: 新增 `coupon_templates`、`coupon_instances` collection（比照 `level` 模組扁平 collection + `prefixCollection` 慣例，非 tenant-nested 路徑）
- **依賴**: 無新增第三方套件（QR code 顯示、序號輸入皆可用既有前端能力實作，不做相機掃碼）
- **明確排除範圍**: 點數（points）功能整體延至下一個 change；不做對外 POS/訂單串接 API；不做 admin 端相機掃碼核銷；不做依會員等級/註冊時間等條件篩選的批次發放；不做商品模組關聯欄位
