## Purpose

LINE notifications triggered by booking status changes, and the guarantee that notification delivery failures never block the underlying booking operation.

## Requirements

### Requirement: Booking status changes trigger a LINE notification

系統 SHALL 在預約狀態變化為 `confirmed`（自動確認或人工核准）、`pendingReview`、`rejected`、`cancelled` 時，各觸發一次對應會員的 LINE 通知。

#### Scenario: 自動確認時觸發通知

- **WHEN** 會員建立的預約因 `approvalMode` 為 `auto` 而直接成為 `confirmed`
- **THEN** 系統觸發一次 LINE 通知給該會員

#### Scenario: 進入待審核時觸發通知

- **WHEN** 會員建立的預約因 `approvalMode` 為 `manual` 而成為 `pendingReview`
- **THEN** 系統觸發一次 LINE 通知給該會員

#### Scenario: 審核核准或拒絕時觸發通知

- **WHEN** 管理員將一筆待審核預約核准或拒絕
- **THEN** 系統觸發一次 LINE 通知給該預約的會員，內容對應核准或拒絕結果

#### Scenario: 取消時觸發通知

- **WHEN** 會員取消自己的預約
- **THEN** 系統觸發一次 LINE 通知給該會員

### Requirement: LINE notification failure does not block the triggering action

系統 SHALL 確保 LINE 通知發送失敗時，不阻斷觸發該通知的預約建立、審核、或取消操作本身的完成。

#### Scenario: 通知發送失敗，預約建立仍然成功

- **WHEN** 會員建立預約的請求本身有效（容量足夠），但觸發的 LINE 通知發送失敗
- **THEN** 系統仍完成該筆預約的建立（狀態依 `approvalMode` 決定），該次請求 SHALL NOT 因通知失敗而回傳錯誤

#### Scenario: 通知發送失敗，審核操作仍然成功

- **WHEN** 管理員核准或拒絕一筆待審核預約，但觸發的 LINE 通知發送失敗
- **THEN** 系統仍完成該筆預約的狀態更新，該次請求 SHALL NOT 因通知失敗而回傳錯誤
