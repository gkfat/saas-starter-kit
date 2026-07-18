## ADDED Requirements

### Requirement: 內容卡片使用共用 AppCard

頁面主要內容區塊 SHALL 使用 `components/cards/AppCard.vue`（`<CardsAppCard>`），不得直接使用裸 `<v-card>` 包裹頁面內容。

#### Scenario: 頁面內容卡片

- **WHEN** 頁面需要以卡片呈現主要內容（如 data table、表單、資訊區塊）
- **THEN** 該卡片 SHALL 使用 `<CardsAppCard>`，不得直接使用 `<v-card>`

#### Scenario: 浮層/選單卡片例外

- **WHEN** 卡片用途為浮層選單或彈出式篩選元件（例如 `components/filter-bar/fields/*`、`components/toast/AppToast.vue`）
- **THEN** 該卡片 MAY 直接使用裸 `<v-card>`，因其角色為浮層 UI 而非頁面內容容器

### Requirement: Dialog 使用共用 DialogCard 與固定結構

所有 `<v-dialog>` 內的卡片內容 SHALL 使用 `components/cards/DialogCard.vue`（`<CardsDialogCard>`），且內部結構 SHALL 依序為 `v-card-title`、`v-card-text`、`v-card-actions`。

#### Scenario: Dialog 卡片元件

- **WHEN** 頁面需要在 `<v-dialog>` 中顯示卡片內容
- **THEN** 該卡片 SHALL 使用 `<CardsDialogCard>`，不得直接使用裸 `<v-card>`

#### Scenario: Dialog 標題樣式

- **WHEN** Dialog 內容包含標題
- **THEN** 標題 SHALL 使用 `<v-card-title class="pa-4">`

#### Scenario: Dialog 操作區按鈕順序

- **WHEN** Dialog 內容包含操作按鈕區（`<v-card-actions class="pa-4">`）
- **THEN** 該區塊 SHALL 先放置 `<v-spacer />`，再依序放置次要按鈕（`kind="secondary"`，如取消）與主要按鈕（`kind="primary"`，如確認）

### Requirement: 一般按鈕使用共用 AppButton

頁面中的業務操作按鈕 SHALL 使用 `components/buttons/AppButton.vue`（`<ButtonsAppButton>`），透過 `kind` prop（`primary` | `secondary` | `text`）決定樣式，不得直接於 `<v-btn>` 上指定 `variant`/`color`。

#### Scenario: 業務操作按鈕

- **WHEN** 頁面或元件需要可點擊觸發動作的按鈕（如送出表單、取消、確認）
- **THEN** 該按鈕 SHALL 使用 `<ButtonsAppButton kind="...">`，不得直接使用 `<v-btn variant="..." color="...">`

#### Scenario: 表格 row 內的 icon 操作按鈕

- **WHEN** Data table 的 row 需要提供 icon-only 操作（如編輯、刪除）
- **THEN** 該按鈕 SHALL 使用 `<ButtonsIconActionBtn>`

#### Scenario: Layout 控制按鈕例外

- **WHEN** 按鈕用途為純 layout 控制（如開關 drawer、關閉 toast、breadcrumb 導覽），且元件不屬於業務操作範疇
- **THEN** 該按鈕 MAY 直接使用裸 `<v-btn icon>`

### Requirement: Data Table 標準結構

頁面中的 `<v-data-table>` SHALL 包裹於 `<CardsAppCard>` 內，SHALL 以 `computed()` 搭配 i18n `t()` 產生 `headers`，並 SHALL 提供 `#no-data` slot。

#### Scenario: Data Table 容器

- **WHEN** 頁面顯示 `<v-data-table>`
- **THEN** 該表格 SHALL 包裹在 `<CardsAppCard>` 內，不得單獨呈現於頁面

#### Scenario: Headers 定義方式

- **WHEN** 定義 `<v-data-table>` 的 `headers`
- **THEN** SHALL 使用 `computed(() => [...])`，各欄位 `title` SHALL 透過 `$t()`/`t()` 產生

#### Scenario: 無資料狀態

- **WHEN** `<v-data-table>` 沒有資料可顯示
- **THEN** SHALL 提供 `#no-data` slot，內容為 `<span class="text-medium-emphasis">{{ $t('xxx.noData') }}</span>`

#### Scenario: 技術性欄位使用 Monospace

- **WHEN** 欄位內容為 ID、timestamp 等技術性資料
- **THEN** 該欄位 SHALL 套用 monospace 樣式（如 `text-caption font-mono`），依循 `vuetify-theme` spec 的 monospace 規則

#### Scenario: Actions 欄位

- **WHEN** `<v-data-table>` 需要提供 row 級操作欄位
- **THEN** 該欄位 SHALL 設定 `key: 'actions'`、`sortable: false`、`align: 'end'`，內容 SHALL 使用 `<ButtonsIconActionBtn>`
