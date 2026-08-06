## Context

`users` 模組（`apps/server/server/modules/users/`）目前的 `User` type 只有 `userId`（系統 UUID，不面向使用者展示）與 `username`（使用者自訂登入帳號）。兩者都不適合當作「會員卡號」：`userId` 太長不利展示，`username` 是使用者自訂字串，語意上是登入帳號而非店家發放的識別碼。

`apps/liff/src/pages/home/index.vue`（會員卡）目前顯示會員名稱與等級，尚未有卡號與可供店家掃描的 QRCode。

## Goals / Non-Goals

**Goals:**

- 定義 `memberNo` 的產生規則：系統自動產生、全域唯一、產生後不可變更
- 註冊流程（`registerUserWithProvider`）產生 `memberNo` 並與帳號一併建立
- 既有會員（開發過程中已建立的測試帳號）一次性 backfill 補上 `memberNo`
- LIFF 會員卡呈現 `memberNo` 與對應 QRCode
- Admin 後台會員列表與會員詳情呈現 `memberNo`

**Non-Goals:**

- 店家端掃碼核銷/查詢介面（掃描端不在本次範圍，本次僅產生可被掃描的 QRCode）
- `memberNo` 的變更/重發機制（不支援使用者或管理員手動修改）
- `level` 模組不受影響，兩者互不相依

## Decisions

### 1. `memberNo` 格式採用 `M` + 註冊當下 epoch 毫秒 + 2 碼隨機英數字尾碼

理由：不需要引入一個「全域遞增計數器」文件（會成為單一熱點文件，每次註冊都要搶同一份 transaction，在真正高併發時會是效能瓶頸）。epoch 毫秒本身天然分散、幾乎不會撞號，加 2 碼隨機尾碼是為了把「同一毫秒內兩筆註冊」這種理論碰撞機率再降到可忽略，不追求密碼學等級的唯一性保證。

替代方案：全域遞增計數器（如 `M00001`、`M00002`）。優點是連號好看、符合傳統會員卡直覺；捨棄原因是需要額外的計數器文件與 transaction，在目前「先求簡單可行」的階段不必要——若未來有「卡號需要連號」的明確商業需求，可另立 change 處理遷移。

### 2. 產生時機與唯一性保證：`users.service.ts` 產生候選值，`users.repo.ts` 提供唯一性查詢，衝突則重試

流程：service 產生候選 `memberNo` → repo 查詢是否已存在（`findUserByMemberNo`）→ 存在則重新產生候選值，最多重試數次 → 不存在則連同 `createUser` 一併寫入。理由：維持既有「repo 不含業務邏輯，service 負責決策」的分工慣例（與 `level` 模組的 tier 驗證邏輯分工一致）。

### 3. `memberNo` 產生為 `registerUserWithProvider()` 內的新步驟，緊接在既有步驟之後、`level.initializeMemberPeriod` 呼叫之前，失敗行為比照既有步驟（拋錯終止註冊）

理由：與 `add-member-level-management` 已記錄的既有問題（`docs/known-issues.md`：註冊流程非原子性）性質相同——本次新增的步驟繼承同一個既有限制，不重複修復，只在 `known-issues.md` 補充這是又一個觸發點。

### 4. 既有會員 backfill 透過一次性腳本/直接操作補齊，不做成常駐程式碼路徑

理由：與 `level` 模組的 `level_member_states` backfill 手法一致——這批資料是本次 change 開發過程中產生的測試帳號，數量少（個位數），一次性補齊即可，不需要在 app 程式碼中保留「處理沒有 memberNo 的舊資料」的相容邏輯。

### 5. QRCode 產生套件：沿用 `apps/admin` 已在用的 `qrcode`（`QRCode.toDataURL()`），不引入新套件

`apps/admin` 的 `LoginMethodsCard.vue`（LINE 綁定 QRCode）已經在用 `qrcode` 套件：`import QRCode from 'qrcode'; QRCode.toDataURL(text)` 產生 base64 PNG data URL，直接丟給 `<img :src="...">`。LIFF 端沿用同一支套件與同一種用法（呼叫 `QRCode.toDataURL(memberNo)`），不需要另外評估或安裝 `qrcode.vue` 這類 Vue 專用元件套件——`apps/liff` 是獨立的 pnpm workspace 套件，仍需在 `apps/liff/package.json` 加上 `qrcode`/`@types/qrcode` 依賴（版本比照 `apps/admin/package.json` 現有版本），但這是「複用已驗證過的既有選型」，不是新增一個未使用過的依賴。

理由：跟既有程式碼保持一致的做法（同一專案裡兩處 QRCode 需求沒必要用兩種不同套件/兩種不同渲染方式），也不需要再花額外時間評估選型。

## Risks / Trade-offs

- **[風險] epoch 毫秒 + 2 碼隨機尾碼理論上仍有極低機率碰撞** → 緩解：service 層有重試機制，repo 唯一性查詢由 Firestore 單一欄位查詢保證，重試次數用盡才會真正失敗（極端情境），可接受
- **[風險] 既有會員 backfill 若之後有更多測試資料被建立，需要重跑一次** → 緩解：本次僅補齊當下已存在的少量測試帳號，若之後仍有缺口，屬於同一類已知限制，可用相同手法再次補齊，不影響核心邏輯正確性
- **[取捨] `apps/liff` 需要新增 `qrcode`/`@types/qrcode` 依賴** → 緩解：與 `apps/admin` 沿用同一套件同一版本，屬於複用既有選型，風險與評估成本都低

## Migration Plan

- 全新欄位，無破壞性變更；`memberNo` 為新增欄位，不影響既有 `userId`/`username` 的既有用途
- 部署順序：先部署 `memberNo` 產生邏輯與 API 回傳 → backfill 既有會員 → 部署 LIFF/admin 顯示變更
- Rollback：`memberNo` 欄位若需回滾，LIFF/admin 端的顯示部分可個別關閉（不影響註冊流程本身），資料庫欄位保留不需清除

## Open Questions

（無——QRCode 套件已確定沿用 `apps/admin` 的 `qrcode`，不需要額外確認）
