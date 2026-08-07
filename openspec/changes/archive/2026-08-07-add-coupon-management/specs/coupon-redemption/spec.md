## ADDED Requirements

### Requirement: 店家人員可透過序號核銷優惠券

系統 SHALL 允許擁有 `coupons:redeem` 權限的使用者輸入優惠券序號（`code`）進行核銷，核銷成功後記錄 `redeemedAt`、`redeemedBy`。

#### Scenario: 成功核銷

- **WHEN** 使用者輸入一組尚未核銷且未過期的有效序號
- **THEN** 系統將對應 `coupon_instances` 標記 `redeemedAt`/`redeemedBy`，回傳成功結果，並寫入一筆 `audit_logs`

#### Scenario: 核銷已使用過的優惠券

- **WHEN** 使用者輸入的序號對應的優惠券已存在 `redeemedAt`
- **THEN** 系統回傳 409 錯誤「此券已使用」，不進行任何寫入

#### Scenario: 核銷已過期的優惠券

- **WHEN** 使用者輸入的序號對應的優惠券 `expiresAt` 已早於目前時間
- **THEN** 系統回傳 409 錯誤「此券已過期」，不進行任何寫入

#### Scenario: 核銷不存在的序號

- **WHEN** 使用者輸入的序號查無對應 `coupon_instances`
- **THEN** 系統回傳 404 錯誤

#### Scenario: 無權限使用者核銷

- **WHEN** 使用者不具備 `coupons:redeem` 權限呼叫核銷 API
- **THEN** 系統回傳 403 並拒絕操作

### Requirement: 核銷需防止並發重複核銷

系統 SHALL 在單一 Firestore transaction 內完成「讀取核銷前狀態」與「寫入核銷結果」，確保同一張優惠券在並發請求下僅能被核銷一次。

#### Scenario: 兩筆核銷請求同時針對同一張券

- **WHEN** 兩個核銷請求幾乎同時對同一張尚未核銷的優惠券送出
- **THEN** 系統保證僅有一筆請求成功核銷，另一筆請求收到 409「此券已使用」錯誤
