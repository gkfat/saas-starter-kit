## Context

目前系統已有 `level`（會員等級）與 `coupons`（優惠券）兩個模組作為架構參考。`level` 模組的 README 明確聲明「完全與 `points` 模組解耦」，代表 `points` 模組是這個系統原本就預留的未來擴充點。本次新增的 `points` 模組沒有任何消費/訂單系統可對接，因此點數的增減完全由後台人工操作觸發，並比照 `level` 模組「狀態文件 + 不可變 ledger」的資料模式。

## Goals / Non-Goals

**Goals:**

- 後台可設定「X 點 = Y 元」的全域折抵比例
- 後台可對任一會員手動增減點數（原因必選，選「其他」需額外文字說明），且不可扣至負數
- 後台可查看單一會員的點數異動明細（ledger）
- LIFF 會員卡顯示目前點數餘額
- LIFF 掃碼頁（獨立頁面，取代原本的 dialog）唯讀呈現點數與換算可兌換金額
- LIFF 提供獨立的點數異動紀錄頁
- 整體功能受 `points` Feature Flag 控制，可整包開關

**Non-Goals:**

- 不對接任何外部訂單/POS/消費事件系統（點數自動累積）
- 不做 LIFF 端「現場核銷/使用點數」的即時扣點流程
- 不做點數到期/歸零批次機制
- 不做依會員等級或商品分眾的差異化折抵規則（僅單一全域比例）
- 不做點數異動原因的權限分級（任何有權限操作點數的管理者皆可選任何原因）

## Decisions

### 1. 模組與 Firestore 資料模型比照 level 模組的「狀態 + ledger」模式

新增獨立 `points` server module（`repo.ts` / `service.ts` / `schema.ts` / `types.ts` / `index.ts`），與 `level`、`users` 模組完全解耦，僅透過 `userId: string` 溝通，不互相 import Firestore 資料。

Collections：

- `points_settings`（單一文件，如 `level_tiers` 概念但簡化為單筆設定）：`{ pointsPerUnit: number, currencyValue: number, updatedAt: string, updatedBy: string }` — 換算金額 = `Math.floor(points / pointsPerUnit) * currencyValue`
- `points_member_states`（doc id = userId）：`{ userId, balance: number, updatedAt }`
- `points_ledger_entries`（doc id 自動產生，不可變流水帳）：`{ id, userId, amount: number（正負皆可）, reason: PointsAdjustReason, reasonNote?: string, balanceAfter: number, createdAt, createdBy }`

理由：沿用已驗證過的架構模式（`level_member_states` + `level_metric_entries`），降低設計風險；`points_settings` 用單一文件而非 `level_tiers` 的多筆 collection，因為折抵比例只有一組全域設定，不需要多筆管理。

**替代方案**：把點數欄位直接加進 `users` collection。**否決**：違反 level 模組已建立的解耦慣例，且 `users` 模組不應承載其他模組的狀態。

### 2. 增減點數用 Firestore transaction 保證原子性與餘額不為負

`recordPointsAdjustment(userId, amount, reason, reasonNote?)` 在 transaction 內讀取目前 `points_member_states.balance`，計算 `newBalance = balance + amount`；若 `newBalance < 0` 則拋出業務錯誤中止交易，否則寫入新的 ledger entry 並更新 `balance`。

理由：比照 `level.repo.ts` 的 `recordMetricTransaction` 模式（repo 層做原子寫入，service 層決定業務規則），避免併發操作造成餘額計算錯誤或允許透支。

### 3. 折抵比例設定與會員點數操作分屬兩個後台子路由

`pages/admin/points/settings.vue`（全域比例設定，低頻）與 `pages/admin/points/members.vue`（會員列表 + 點入單一會員開啟 `MemberPointsDialog.vue`，高頻日常操作）分離，比照 coupons 模組「管理頁 / 核銷頁」分離的既有慣例。

### 4. LIFF 掃碼頁與異動紀錄頁皆為獨立路由頁面

原本 `AppHeader.vue` 內嵌 dialog 呈現 QR code，移除該 dialog 邏輯，新增 `pages/member-card/index.vue`（QR code + 點數 + 可兌換金額，唯讀，不含等級資訊），並新增 `pages/points/index.vue`（點數異動明細列表）。`member-center` 首頁提供「查看點數紀錄」入口連結導向後者。`MemberCard.vue`（等級卡）直接擴充顯示點數餘額，不另建點數卡片。

理由：符合既有 `coupons` 模組「首頁只是入口，明細另開頁」的慣例；掃碼頁精簡呈現避免店員資訊過載。

### 5. Feature Flag `points` 比照 `feature-flags` 模組既有機制擴充

在 `packages/shared` 的 `FeatureFlag` enum 新增 `Points`，新增環境變數 `FEATURE_POINTS_ENABLED`（預設 `true`），行為與 `auditLog`/`loginLog` 一致：停用時後台導覽項目隱藏、直接導航頁面被導回、LIFF 對應頁面/入口隱藏、API 回傳功能停用錯誤。

## Risks / Trade-offs

- [人工操作點數可能因輸入錯誤造成餘額異常] → 增減表單需二次確認（顯示異動前後餘額預覽），且 ledger 為不可變紀錄可供事後稽核回溯
- [目前沒有消費事件來源，折抵金額顯示可能與現場實際折抵脫節（店員須自行對照收銀機操作）] → 本次明確定義為唯讀呈現＋人工事後調整，若未來需要即時扣點，需另開 change 設計（例如比照 coupon 的 redeem 流程或串接外部 POS）
- [折抵比例為全域單一設定，未來若需依會員等級差異化，需重新設計 `points_settings` 資料結構] → 目前需求未提及分眾折抵，先以最小可行版本上線，設計上 `points_settings` 已獨立成模組化 collection，未來擴充不影響其他部分

## Migration Plan

- 新增功能，無既有資料遷移需求
- `points` Feature Flag 預設啟用，部署後即對外可見；若需分階段導入，可先於環境變數設 `FEATURE_POINTS_ENABLED=false` 關閉後再視情況開啟
- Rollback：關閉 Feature Flag 即可隱藏所有入口與阻擋 API，無需資料回滾（無資料結構變更影響既有模組）
