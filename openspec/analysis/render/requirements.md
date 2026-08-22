# Requirements — Booking Module

來源：`openspec/analysis/requirements.yaml`（本檔為渲染版，異動請改 yaml 後重新產生）

## Functional Requirements

| ID         | Title                            | Priority | Context                    | Note                                                                  |
| ---------- | -------------------------------- | -------- | -------------------------- | --------------------------------------------------------------------- |
| FR-001     | 後台建立/編輯/停用服務項目       | must     | CTX-ACTOR-002, CTX-CON-002 |                                                                       |
| FR-002     | 後台設定服務項目的可預約時段     | must     | CTX-ACTOR-002              |                                                                       |
| FR-003     | 服務項目可選填指定人員           | should   | CTX-ACTOR-002, CTX-ASM-002 | 待確認 Provider 實體範圍                                              |
| FR-004     | 會員瀏覽可預約服務項目與時段     | must     | CTX-ACTOR-001              |                                                                       |
| FR-005     | 會員建立預約                     | must     | CTX-ACTOR-001              |                                                                       |
| FR-006     | 依審核模式決定預約初始狀態       | must     | CTX-ACTOR-002, CTX-ASM-003 |                                                                       |
| FR-007     | 後台審核待審核預約               | must     | CTX-ACTOR-002              |                                                                       |
| FR-008     | 會員取消自己的預約               | should   | CTX-ACTOR-001              | 待確認取消時限規則                                                    |
| FR-009     | 容量已滿拒絕新預約並避免超賣     | must     | CTX-CON-004                |                                                                       |
| ~~FR-010~~ | ~~要求會員為 LINE 好友才能預約~~ | —        | CTX-EXT-002, CTX-ASM-001   | **DEPRECATED 2026-08-20**：使用者決策移除，改為僅需 LIFF 登入即可預約 |
| FR-011     | 預約狀態變化發送 LINE 通知       | must     | CTX-EXT-002                | 待確認內容/時機/重試策略                                              |
| FR-012     | 預約模組受 feature flag 控制     | must     | CTX-CON-001                |                                                                       |
| FR-013     | 後台查詢/篩選預約列表            | must     | CTX-ACTOR-002              |                                                                       |
| FR-014     | 逾期未審核預約的處理             | could    | CTX-ACTOR-003              | 待確認處理規則與觸發機制                                              |

## Non-Functional Requirements

| ID      | Title                           | Metric                                              | Priority | Context     | Note                |
| ------- | ------------------------------- | --------------------------------------------------- | -------- | ----------- | ------------------- |
| NFR-001 | 容量併發控制正確性              | 併發請求下不可超過容量上限（Firestore transaction） | must     | CTX-CON-004 |                     |
| NFR-002 | LINE 通知失敗不阻斷主流程       | 未量化，需與相關人確認                              | must     | CTX-EXT-002 | 待確認重試/補償策略 |
| NFR-003 | Feature flag 行為一致性         | 對照既有 feature-flag spec 驗收模式                 | must     | CTX-CON-001 |                     |
| NFR-004 | LINE Messaging API 憑證安全存放 | 未量化（安全慣例）                                  | must     | CTX-CON-003 |                     |

## 關鍵假設（Context）

- **CTX-ASM-001**：「LINE 好友」= LINE 官方帳號好友關係，非 LINE Login 授權範圍 —— 待確認取得方式
- **CTX-ASM-002**：Provider 是否需獨立實體 —— 待確認
- **CTX-ASM-003**：審核模式為服務項目層級設定
- **CTX-ASM-004**：本次不含與 level/points 模組整合 —— 待確認是否納入未來範圍

## 待確認項目彙總（note: needs review）

- FR-003, FR-008, FR-010, FR-011, FR-014
- NFR-002
- CTX-ACTOR-003, CTX-EXT-002, CTX-ASM-001, CTX-ASM-002, CTX-ASM-004
