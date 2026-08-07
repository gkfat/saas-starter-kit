## Context

系統目前沒有訂單/金流/POS 模組，優惠券的「使用」無法透過線上折抵訂單金額實現，只能是「發放 → 會員持有 → 到店出示 → 人工核銷」的線下流程。此設計比照 `level` 模組已建立的慣例（扁平 Firestore collection + `prefixCollection`、`modules/*/service.ts` 不直接碰 Firestore、`modules/logs` 統一寫 `audit_logs`）。

此 change 是「點數（points）」功能的前置依賴——下一個 change 會讓會員用點數兌換優惠券，屆時會直接呼叫本模組既有的「發放給某會員」service 方法，不需要另開核銷/發放路徑。

## Goals / Non-Goals

**Goals:**

- 管理員可建立優惠券範本（含折扣類型、有效天數），管理範本生命週期狀態（草稿/已發行/停用）
- 管理員可對單一或多位會員批次發放已發行的範本，同一會員可被重複發放
- 管理員可查看每個範本的發放紀錄
- 店家人員可透過序號手動核銷優惠券，並發安全
- 會員可在 LIFF 端查看自己持有的優惠券（可使用/已使用/已過期），並顯示 QR code 供到店出示
- 所有異動動作可稽核（`audit_logs`）

**Non-Goals:**

- 不做線上訂單金額折抵計算
- 不做對外 POS/收銀系統串接 API
- 不做 admin 端相機掃碼核銷（僅手動輸入序號，外接掃碼器可間接支援）
- 不做依會員等級/註冊時間等條件篩選的批次發放
- 不做商品模組關聯欄位（`productId` 等），待商品模組實際存在時再擴充
- 不做優惠券總發放量上限、會員自助兌換碼、公開先到先得領取
- 點數兌換優惠券的串接邏輯不在本 change 範圍內

## Decisions

### 1. 兩層資料模型：範本（template）與實例（instance）

`coupon_templates`（優惠券規則定義）與 `coupon_instances`（實際發給會員的個別券，含唯一序號）分開為兩個 collection。

- **`coupon_templates`**：`id`、`title`、`description`、`discountType`（`'fixed' | 'percentage' | 'item'`）、`discountValue?`（`fixed`/`percentage` 才需要，`item` 類型的兌換內容寫在 `description`）、`validDays`、`status`（`'draft' | 'published' | 'disabled'`）、`createdAt`、`updatedAt`
- **`coupon_instances`**：`id`、`templateId`、`memberId`、`code`（唯一序號，用於核銷與 QR code）、`issuedAt`、`issuedBy`、`expiresAt`（= `issuedAt + validDays`，發放當下計算）、`redeemedAt?`、`redeemedBy?`

**Why**：範本是「可重複使用的規則」，實例是「一次性的憑證」，兩者生命週期完全不同（範本可長期存在並重複發放，實例一次核銷即結束）。分開避免範本欄位與逐張券的個別狀態耦合，也讓「發放紀錄」查詢（依 `templateId` 查 `coupon_instances`）與「會員持有清單」查詢（依 `memberId` 查）都能各自建立對應索引。

**Alternative considered**：單一 collection 用 `type: 'template' | 'instance'` 區分——拒絕，因為兩者欄位差異大（範本沒有 `memberId`/`code`，實例沒有 `status`），混在一張表會讓 schema 充滿條件式必填欄位。

### 2. `coupon_instances` 不存 `status` 欄位，即時推導

不額外存 `status`（如 `'unused' | 'redeemed' | 'expired'`），而是查詢/顯示當下用 `redeemedAt` 是否存在、`expiresAt` 是否已過，推導出目前狀態。

**Why**：狀態完全由兩個時間戳決定，沒有需要獨立維護的中間態；存欄位會產生「到期但欄位還沒更新」的資料不一致風險，還要額外排程去同步，而核銷/查詢當下即時判斷就足夠正確，不需要批次工作（與 `level` 的週期批次評等不同，這裡沒有需要主動改變外部可見狀態的時機）。

**Alternative considered**：比照 `level` 的批次模式，跑排程把過期券標記 `expired`——拒絕，過度設計；`expiresAt < now` 在核銷 API 與 LIFF 查詢時判斷即可涵蓋所有需求。

### 3. 核銷採 Firestore transaction 防並發

核銷 API 在同一個 Firestore transaction 內讀取 `coupon_instances/{id}`，檢查 `redeemedAt` 是否已存在、`expiresAt` 是否已過期；只有兩者皆通過才寫入 `redeemedAt`/`redeemedBy`。已核銷或已過期則回傳 409 明確錯誤。

**Why**：兩位店家人員同時核銷同一張券是真實會發生的競態條件，必須在資料庫層面保證原子性，而非只靠應用層先查後寫（會有 race window）。

### 4. RBAC 拆分 `coupons:issue` 與 `coupons:redeem`

權限集合為 `coupons:read`、`coupons:write`（範本 CRUD）、`coupons:issue`（發放）、`coupons:redeem`（核銷），四者獨立而非合併成單一 `write`。

**Why**：第一線核銷人員通常只需要 `coupons:redeem`，不該擁有編輯範本或發放的權限；發放與範本編輯也可能是不同層級的管理者操作。拆細權限符合最小權限原則，且與現有 `Permission` 命名慣例（`resource:action`）一致。

### 5. 沿用 `prefixCollection`，不採 tenant-nested 路徑

`coupon_templates`、`coupon_instances` 用 `adminDb().collection(prefixCollection('coupon_templates'))` 的扁平路徑，而非 `tenants/{tenantId}/coupon_templates` 巢狀路徑。

**Why**：實際檢查 `level`、`users` 等既有模組的 repo 實作，全部採 `prefixCollection`（`dev_`/`prod_` 前綴）扁平 collection，並未使用 tenant-nested 路徑；`tenants/{tenantId}/` 只出現在專案背景說明文字與另一個尚未實作的草稿 change 中，與目前程式碼實際慣例不符。本 change 依照程式碼現狀而非文件描述。

## Risks / Trade-offs

- **[Risk]** 序號手動輸入可能被店家人員輸入錯誤或截圖分享給非本人核銷 → **Mitigation**：序號設計為短碼（如 8 碼英數）降低輸入錯誤機率；核銷本來就是信任到店出示的人工流程，與紙本優惠券的信任模型一致，非本 change 需解決的技術問題。
- **[Risk]** 同一會員被無限次重複發放同一範本，可能造成濫用 → **Mitigation**：這是管理員手動操作的行銷工具，設計上信任操作者判斷；如未來出現濫用情境，可在 UI 上顯示會員已持有清單輔助判斷，屬於 UI 層可疊加的改動。
- **[Risk]** `coupon_instances` 隨發放量增長無上限增長 → **Mitigation**：與 `level_metric_entries`、`audit_logs` 等既有 collection 成長模式一致，屬於已知可接受的量級（demo/中小型會員規模），非本 change 需優化的效能問題。

## Migration Plan

全新模組，無既有資料需要遷移。部署順序：

1. 部署 `packages/shared`（DTO、permission、feature flag）與 `apps/server`（`modules/coupons`、API）
2. 角色權限設定新增 `coupons:*`（依角色決定授予範圍）
3. 部署 `apps/admin`（優惠券管理頁面）
4. 部署 `apps/liff`（我的優惠券頁面、首頁卡片），受 `FeatureFlag.Coupon` 保護，預設關閉直到後台已建立至少一個已發行範本
5. Rollback：關閉 `FeatureFlag.Coupon` 即可隱藏 LIFF 端功能；admin 端頁面本身無破壞性風險，可直接下架路由

## Open Questions

（無）
