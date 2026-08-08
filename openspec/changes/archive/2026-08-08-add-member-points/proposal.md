## Why

會員目前只有等級（level）機制，缺乏可累積、可折抵消費金額的點數功能。店家需要一套能人工發放/扣除會員點數、設定點數折抵金額比例、並讓會員在 LIFF 端查看點數餘額與異動紀錄的機制，以支援現場折抵與會員經營。

## What Changes

- 新增 `points` server module：會員點數餘額、點數異動明細（ledger）、全域折抵比例設定，皆透過人工操作管理（無自動累積來源）
- 新增後台「會員點數管理」功能：
  - 折抵比例設定頁（全域比例：X 點 = Y 元）
  - 會員點數列表頁（搜尋/分頁）
  - 單一會員點數操作 dialog（增減點數表單 + 異動明細列表）
  - 增減點數原因為必選 Select（消費回饋／客訴補償／活動贈送／生日禮／其他），選「其他」時需額外填寫文字說明
  - 扣點不可使餘額變為負數
- 修改 LIFF 會員卡（`MemberCard.vue`）：新增顯示目前點數餘額
- **BREAKING**：LIFF 掃會員條碼 QR code 由 dialog（`AppHeader.vue` 內嵌）改為獨立頁面，新增顯示目前點數與換算可兌換金額（唯讀）
- 新增 LIFF 「點數紀錄」獨立頁面（`pages/points/index.vue`），列出點數異動明細；member-center 提供入口連結
- 新增 Feature Flag：`points`（比照現有 `auditLog`/`loginLog` 機制，預設關閉時隱藏後台導覽項目、LIFF 對應頁面/入口，並使相關 API 回傳功能停用錯誤）

## Capabilities

### New Capabilities

- `member-points-management`: 後台管理員手動增減會員點數、設定全域折抵比例、查看點數異動明細
- `member-points-wallet-liff`: LIFF 端會員點數餘額顯示（會員卡整合）、獨立掃碼頁呈現點數與可兌換金額、點數異動紀錄頁

### Modified Capabilities

- `feature-flags`: 新增 `points` 旗標，行為比照既有 `auditLog`/`loginLog`（預設啟用；停用時隱藏後台導覽與 LIFF 入口／頁面，並使對應 API 回傳功能停用錯誤）

## Impact

- **Server**: 新增 `apps/server/server/modules/points/`（repo/service/schema/types/index）；新增 Firestore collections `points_settings`、`points_member_states`、`points_ledger_entries`；新增/擴充 `points` API routes；擴充 `FeatureFlag` enum（`packages/shared`）
- **Admin**: 新增 `pages/admin/points/settings.vue`、`pages/admin/points/members.vue`；新增元件 `components/points/MemberPointsDialog.vue`（及列表/工具列元件）；`AppDrawer.vue` 新增導覽項目（受 flag 控制）
- **LIFF**: 修改 `components/AppHeader.vue`（移除 QR dialog）、`components/member/MemberCard.vue`（新增點數顯示）；新增 `pages/member-card/index.vue`（獨立掃碼頁）、`pages/points/index.vue`（異動紀錄頁）；`router.ts` 新增對應路由；`pages/member-center/index.vue` 新增入口連結
- **Shared**: 新增 `packages/shared/dto/points.ts`；擴充 `FeatureFlag` 型別
- **無外部相依變更**：沿用現有 Firestore、Firebase Auth、Vuetify、Nitro 架構，不新增第三方套件
