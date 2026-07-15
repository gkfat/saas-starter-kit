## ADDED Requirements

### Requirement: 使用者可編輯個人 displayName

已登入使用者 SHALL 能在個人資料頁編輯並儲存自己的 `displayName`。輸入值 SHALL 經過前後端驗證：trim 後長度需介於 1～20 字元，不可為空字串。編輯入口為卡片標題列的編輯按鈕，點擊後開啟彈窗（modal）進行編輯。

#### Scenario: 成功更新 displayName

- **WHEN** 使用者在編輯彈窗輸入合法的新 displayName 並點擊儲存
- **THEN** 系統呼叫 `PATCH /api/profile/display-name` 更新 Firestore 中的使用者資料，並回傳成功結果；前端顯示成功提示，彈窗關閉，畫面上的 displayName 立即更新為新值

#### Scenario: 輸入空白 displayName

- **WHEN** 使用者將 displayName 輸入框清空或僅輸入空白字元
- **THEN** 系統 SHALL 即時顯示錯誤訊息並停用「儲存」按鈕；若仍強行呼叫 API，後端 SHALL 回傳驗證錯誤（400），不寫入 Firestore

#### Scenario: 輸入超過長度限制

- **WHEN** 使用者輸入超過 20 字元的 displayName
- **THEN** 系統 SHALL 即時顯示錯誤訊息並停用「儲存」按鈕；若仍強行呼叫 API，後端 SHALL 回傳驗證錯誤（400），不寫入 Firestore

#### Scenario: 未登入使用者呼叫 API

- **WHEN** 未帶有效身份驗證的請求呼叫 `PATCH /api/profile/display-name`
- **THEN** 系統 SHALL 回傳未授權錯誤（401），不進行任何更新

### Requirement: displayName 與 role 欄位標籤使用 i18n

個人資料頁中 `displayName`、`role` 欄位標籤與編輯相關文案（編輯按鈕、儲存成功/失敗訊息、驗證錯誤訊息）SHALL 透過 i18n key 呈現，不得使用寫死的中/英文字串，且需同時存在於 `en.json` 與 `zh-TW.json`。`role` 的值 SHALL 透過 `role.<roleValue>` 對應的 i18n key 顯示翻譯後的角色名稱，而非直接顯示原始角色代碼。

#### Scenario: 切換語系顯示對應文案

- **WHEN** 使用者將系統語系切換為英文或繁體中文
- **THEN** 個人資料頁的 displayName 標籤、role 標籤與其翻譯值、編輯按鈕文字與儲存結果提示 SHALL 顯示對應語系的翻譯內容

### Requirement: 使用者可查看 Email 綁定狀態

個人資料頁 SHALL 顯示使用者的 Email 綁定狀態：若 `email` 為 null，顯示「未綁定」與一個「綁定」按鈕；該按鈕目前僅為 UI 呈現，不綁定任何後端功能（停用狀態）。

#### Scenario: 使用者未綁定 Email

- **WHEN** 使用者的帳號 `email` 欄位為 null 並進入個人資料頁
- **THEN** 頁面 SHALL 顯示「未綁定」文字與已停用（disabled）的「綁定」按鈕

#### Scenario: 使用者已綁定 Email

- **WHEN** 使用者的帳號 `email` 欄位有值
- **THEN** 頁面 SHALL 直接顯示該 Email 內容

### Requirement: 使用者可手動驗證手機號碼

個人資料頁 SHALL 在手機號碼未驗證時顯示「未驗證」文字與一個「驗證」按鈕，點擊後開啟彈窗（modal）進行手機號碼驗證。輸入框 SHALL 以 `+886` 作為固定 prefix 呈現，使用者僅需輸入本地號碼；SHALL 驗證輸入格式須為 `09` 開頭共 10 碼、或 `9` 開頭共 9 碼的純數字，格式錯誤時即時顯示錯誤訊息並停用「發送驗證碼」按鈕。送出時系統 SHALL 自動組成帶國碼的完整號碼（`+886` + 去除開頭 `0` 後的本地號碼）送出驗證簡訊。OTP 輸入 SHALL 使用 Vuetify 的 OTP 元件（6 碼）。

#### Scenario: 使用者尚未綁定手機號碼

- **WHEN** 使用者的帳號 `phone` 欄位為空值並進入個人資料頁
- **THEN** 頁面 SHALL 顯示「未驗證」文字與「驗證」按鈕

#### Scenario: 輸入不符格式的手機號碼

- **WHEN** 使用者在驗證彈窗輸入非數字或不符合 `09` 開頭 10 碼／`9` 開頭 9 碼格式的號碼
- **THEN** 系統 SHALL 即時顯示錯誤訊息，並停用「發送驗證碼」按鈕

#### Scenario: 成功送出並完成驗證

- **WHEN** 使用者輸入合法的本地號碼並點擊「發送驗證碼」，收到簡訊後於 OTP 元件輸入正確驗證碼並確認
- **THEN** 系統 SHALL 以 `+886` + 本地號碼（去除開頭 0）組成完整號碼送出驗證；驗證成功後畫面上的手機號碼立即更新為已驗證狀態，彈窗關閉

#### Scenario: 使用者已綁定手機號碼

- **WHEN** 使用者的帳號 `phone` 欄位已有值並進入個人資料頁
- **THEN** 頁面 SHALL 顯示已驗證的手機號碼與勾選圖示，不顯示「驗證」按鈕

### Requirement: 使用者可綁定或解除綁定 Google 登入方式

個人資料頁 SHALL 顯示「Google 登入」的綁定狀態（已綁定／未綁定）。未綁定時顯示「綁定」按鈕，點擊後透過既有 Google 帳號連結流程完成綁定。已綁定時顯示「解除綁定」按鈕，點擊後 SHALL 先彈出確認彈窗，確認後才呼叫解除綁定 API。當使用者僅剩此單一登入方式時，SHALL 禁止解除綁定（前端停用按鈕，後端回傳 409）。

#### Scenario: 綁定 Google 帳號

- **WHEN** 使用者尚未綁定 Google 帳號，點擊「綁定」按鈕並完成 Google 授權流程
- **THEN** 系統呼叫 `PATCH /api/profile/google-provider` 將 `google` 加入使用者 `providers`，畫面顯示成功提示與已綁定狀態

#### Scenario: 解除綁定 Google 帳號（有其他登入方式）

- **WHEN** 使用者已綁定 Google 帳號且 `providers` 尚有其他登入方式，點擊「解除綁定」按鈕並在確認彈窗中確認
- **THEN** 系統呼叫 `DELETE /api/profile/google-provider` 將 `google` 從 `providers` 移除，畫面顯示成功提示與未綁定狀態

#### Scenario: 嘗試解除唯一的登入方式

- **WHEN** 使用者的 `providers` 僅剩 `google` 一項
- **THEN** 「解除綁定」按鈕 SHALL 為停用狀態；若仍強行呼叫 API，後端 SHALL 回傳 409 錯誤，不進行任何更新

### Requirement: 個人資料頁卡片版面

個人資料頁 SHALL 由「基本資料」與「登入方式」兩張獨立卡片組成，並列顯示且等高（依內容較多的卡片自動撐開高度）。

#### Scenario: 兩張卡片等高顯示

- **WHEN** 使用者進入個人資料頁，且兩張卡片內容高度不同
- **THEN** 兩張卡片 SHALL 呈現相同高度，不會有明顯的視覺落差
