## Why

會員目前沒有任何系統發給、面向會員展示的識別碼——LIFF 端只能顯示使用者自訂的登入帳號（`username`），無法作為店家現場核對身份或掃碼辨識會員的依據。`add-member-level-management` 導入等級制度後，LIFF 會員卡（首頁）已經有「會員卡」的視覺雛型，但缺少卡號與可掃描的條碼/QRCode，無法真正在店家端使用。

## What Changes

- 新增 `memberNo`（會員編號）欄位，於會員註冊流程中由系統自動產生，唯一且不可變更
- 既有會員（`add-member-level-management` 開發過程中已建立的測試帳號）需一次性 backfill 補上 `memberNo`
- LIFF 會員卡（`apps/liff/src/pages/home/index.vue`）顯示 `memberNo`，並新增 QRCode（內容為 `memberNo`），供店家掃描辨識會員
- Admin 後台會員列表（`/admin/members`）與會員詳情（`MemberDetailDialog`）呈現 `memberNo` 欄位

不包含於本次範圍：

- 店家端掃碼核銷/查詢介面（本次僅產生與呈現 QRCode，不含掃描端功能）
- `level` 模組的任何異動

## Capabilities

### New Capabilities

- `member-number`：會員編號的產生規則、唯一性保證、既有會員 backfill、LIFF 端顯示與 QRCode 呈現、admin 後台呈現

### Modified Capabilities

（無現有 capability 的需求文字變更；註冊流程新增 `memberNo` 產生步驟屬於 `member-number` capability 的需求範圍，不修改 `user-registration` 既有需求本身）

## Impact

- 修改程式碼：`apps/server/server/modules/users/`（`users.types.ts` 新增欄位、`users.repo.ts` 新增產生與唯一性檢查邏輯、`users.service.ts` 註冊流程串接）
- 新增/修改 API：會員列表與會員詳情 API 回傳新增 `memberNo` 欄位
- 新增前端套件依賴：LIFF 端需要 `qrcode`（沿用 `apps/admin` 已在用的同一套件與版本，見 design.md）
- 修改頁面：`apps/liff/src/pages/home/index.vue`（會員卡加上卡號與 QRCode）、`apps/admin/pages/admin/members/index.vue`、`apps/admin/components/users/UsersTable.vue`、`apps/admin/components/users/MemberDetailDialog.vue`
- 既有資料：需一次性 backfill script/操作，補上目前已存在會員的 `memberNo`
