# Use Cases — Booking Module

來源：`openspec/analysis/use-cases.yaml`（本檔為渲染版，異動請改 yaml 後重新產生）

## Story 總覽

| ID        | Actor  | Story                    | Requirements                                                    |
| --------- | ------ | ------------------------ | --------------------------------------------------------------- |
| STORY-001 | Admin  | 建立/編輯/停用服務項目   | FR-001                                                          |
| STORY-002 | Admin  | 設定服務項目時段         | FR-002                                                          |
| STORY-003 | Admin  | 選填指定人員             | FR-003                                                          |
| STORY-004 | Member | 瀏覽可預約服務項目與時段 | FR-004                                                          |
| STORY-005 | Member | 建立預約                 | FR-005, FR-006, FR-009（原含 ~~FR-010~~，已於 2026-08-20 廢棄） |
| STORY-006 | Admin  | 審核待審核預約           | FR-007                                                          |
| STORY-007 | Member | 取消自己的預約           | FR-008                                                          |
| STORY-008 | System | 狀態變化時發送 LINE 通知 | FR-011                                                          |
| STORY-009 | Admin  | 查詢/篩選預約列表        | FR-013                                                          |
| STORY-010 | System | 處理逾期未審核預約       | FR-014                                                          |

---

## UC-001 Admin 建立/編輯/停用服務項目

- **Actor**：CTX-ACTOR-002 (Admin)
- **Preconditions**：具管理權限；`booking` flag 啟用
- **Main Flow**：開啟管理頁 → 輸入/編輯名稱、說明、容量、審核模式 → 驗證 → 儲存
- **Alternate Flows**：輸入無效 / 權限不足（403）
- **Postconditions**：服務項目建立/更新完成
- **Requirements**：FR-001

## UC-002 Admin 設定服務項目時段

- **Actor**：CTX-ACTOR-002 (Admin)
- **Preconditions**：服務項目已存在；`booking` flag 啟用
- **Main Flow**：選擇服務項目 → 新增時段（起訖時間、容量） → 驗證區間 → 儲存
- **Alternate Flows**：輸入無效 / 權限不足
- **Postconditions**：時段建立完成
- **Requirements**：FR-002
- **待確認**：同服務項目時段重疊規則

## UC-003 Admin 指定服務項目的可選人員

- **Actor**：CTX-ACTOR-002 (Admin)
- **Preconditions**：服務項目已存在；Provider 是否獨立實體待確認
- **Main Flow**：服務項目/時段設定中選填人員 → 儲存
- **Alternate Flows**：權限不足
- **Postconditions**：記錄可選人員資訊
- **Requirements**：FR-003
- **待確認**：Provider 實體範圍（獨立管理 vs 簡單欄位）

## UC-004 會員瀏覽可預約服務項目與時段

- **Actor**：CTX-ACTOR-001 (Member)
- **Preconditions**：已登入；`booking` flag 啟用
- **Main Flow**：開啟 LIFF 預約頁 → 取得啟用中服務項目 → 選擇 → 取得時段與剩餘容量
- **Alternate Flows**：未登入 / 無啟用中服務項目（回空清單）
- **Postconditions**：取得可預約清單
- **Requirements**：FR-004

## UC-005 會員建立預約

- **Actor**：CTX-ACTOR-001 (Member)
- **Preconditions**：已登入；`booking` flag 啟用（**不再要求 LINE 好友**，2026-08-20 使用者決策移除）
- **Main Flow**：選擇服務項目/時段/可選人員 → transaction 內檢查容量 → 依審核模式決定初始狀態 → 寫入紀錄 → 觸發 LINE 通知（UC-008，best-effort，不阻斷本流程）
- **Alternate Flows**：容量已滿 / 輸入無效 / 併發衝突僅一方成功
- **Postconditions**：預約建立為「已確認」或「待審核」
- **Requirements**：FR-005, FR-006, FR-009（原含 ~~FR-010~~，已廢棄）
- **Constraints**：NFR-001（併發正確性）

## UC-006 Admin 審核待審核預約

- **Actor**：CTX-ACTOR-002 (Admin)
- **Preconditions**：預約為「待審核」；具審核權限；`booking` flag 啟用
- **Main Flow**：選擇待審核預約 → 核准/拒絕 → 更新狀態 → 觸發 LINE 通知（UC-008）
- **Alternate Flows**：狀態已變更（例如會員已取消） / 權限不足
- **Postconditions**：狀態為「已確認」或「已拒絕」
- **Requirements**：FR-007

## UC-007 會員取消預約

- **Actor**：CTX-ACTOR-001 (Member)
- **Preconditions**：本人預約；尚未開始；取消時限待確認
- **Main Flow**：選擇預約 → 送出取消 → 驗證時限（待確認） → 更新為「已取消」、釋放容量 → 觸發 LINE 通知（UC-008）
- **Alternate Flows**：非本人 / 超過時限（若有規則） / 重複取消
- **Postconditions**：狀態為「已取消」，容量恢復
- **Requirements**：FR-008
- **待確認**：取消時限規則

## UC-008 系統於預約狀態變化時發送 LINE 通知

- **Actor**：CTX-ACTOR-003（借用 System Scheduler，範圍待 review）
- **Preconditions**：狀態剛變化；LINE Messaging API 整合已就緒（**目前專案尚未具備**）
- **Main Flow**：組成通知內容（規則待確認） → 呼叫 LINE Messaging API 發送
- **Alternate Flows**：API 失敗（記錄、不阻斷主流程、重試策略待確認） / 會員非好友或封鎖
- **Postconditions**：通知送出或失敗已記錄
- **Requirements**：FR-011
- **Constraints**：NFR-002（失敗不阻斷主流程）
- **待確認**：actor 範圍是否需要 context.yaml 新增獨立「Notification Service」角色；通知內容/重試策略

## UC-009 Admin 查詢/篩選預約列表

- **Actor**：CTX-ACTOR-002 (Admin)
- **Preconditions**：具查詢權限；`booking` flag 啟用
- **Main Flow**：開啟列表 → 輸入篩選條件 → 取得結果
- **Alternate Flows**：查無資料 / 權限不足
- **Postconditions**：取得篩選後列表
- **Requirements**：FR-013

## UC-010 系統處理逾期未審核預約

- **Actor**：CTX-ACTOR-003 (System Scheduler)
- **Preconditions**：待審核且逾期（門檻待確認）；觸發機制待確認
- **Main Flow**：排程掃描逾期預約 → 依規則處理（待確認）
- **Alternate Flows**：掃描期間已被審核 → 略過
- **Postconditions**：依規則處理完成（規則待確認）
- **Requirements**：FR-014
- **待確認**：逾期門檻、觸發機制、處理規則

---

## 覆蓋率摘要

- 14 條 FR 中，13 條對應到 10 個 use case；其中 **FR-010 已於 2026-08-20 廢棄**（會員不再需要 LINE 好友即可預約），UC-005 已改為只追溯 FR-005/006/009
- **FR-012**（feature flag 控制）刻意不產生獨立 use case——屬跨切面系統行為，已以 `preconditions` 形式套用到所有其他 use case，詳見 yaml 的 `gap_notes`
- 無遺漏未覆蓋的（非 deprecated）FR
