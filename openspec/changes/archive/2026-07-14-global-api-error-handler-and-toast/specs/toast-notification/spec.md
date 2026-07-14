## ADDED Requirements

### Requirement: Toast 通知狀態管理

系統 SHALL 提供 `useToast` composable，以 module-level singleton `ref` 維護通知佇列，支援 `showSuccess(message)`、`showError(message)`、`showInfo(message)` 三種呼叫方式，每則通知含有唯一 id、type、message 與 duration（預設 4000ms）。

#### Scenario: 顯示成功通知

- **WHEN** 呼叫 `showSuccess('操作成功')`
- **THEN** 佇列中新增一則 type 為 `success` 的通知，並在 UI 上顯示

#### Scenario: 顯示錯誤通知

- **WHEN** 呼叫 `showError('發生錯誤')`
- **THEN** 佇列中新增一則 type 為 `error` 的通知，並在 UI 上顯示

#### Scenario: 多則通知佇列

- **WHEN** 連續呼叫 `showSuccess` 兩次
- **THEN** 兩則通知同時出現於畫面上，各自獨立計時消失

### Requirement: Toast UI 元件動畫

系統 SHALL 提供 `AppToast.vue` 元件，使用 Vue `<TransitionGroup>` 實現進場 slide-up 動畫（從底部往上進入）與離場 fade-out 動畫，元件固定定位於畫面右下角，z-index 高於 Vuetify dialog（>= 9999）。

#### Scenario: 通知進場動畫

- **WHEN** 新通知加入佇列
- **THEN** Toast 從畫面底部向上滑入

#### Scenario: 通知自動消失

- **WHEN** 通知顯示時間（duration）到期
- **THEN** Toast 執行 fade-out 動畫後從 DOM 移除

#### Scenario: 手動關閉通知

- **WHEN** 使用者點擊 Toast 上的關閉按鈕
- **THEN** Toast 立即執行離場動畫並移除

### Requirement: Toast 掛載於根層

系統 SHALL 在 `app.vue` 中掛載 `<AppToast />` 一次，確保所有頁面皆可觸發通知而無需各自引入元件。

#### Scenario: 跨頁面觸發通知

- **WHEN** 任意頁面呼叫 `useToast().showSuccess(...)`
- **THEN** `AppToast` 在 `app.vue` 層顯示通知，不受頁面切換影響
