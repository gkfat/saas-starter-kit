## Why

目前 `v-card`、`v-btn`、`v-data-table` 的使用方式（何時用裸 Vuetify 元件、何時用專案內共用元件、dialog 結構順序、data table 的 no-data/monospace/actions 欄位規範）僅以「約定成俗」的方式存在於現有程式碼中，未被明確記錄。新頁面或新元件在實作時容易各自發揮，造成外觀與結構不一致（例如裸 `v-btn` 混用 `ButtonsAppButton`、dialog 的 padding/按鈕順序不一致）。將現況盤點結果落成 spec，讓後續開發與 review 有明確依據可查。

## What Changes

- 新增 `ui-components` spec，記錄 Card 容器、Button、Data Table 三類元件的標準使用方式與例外情境
- 不變更任何現有元件實作或頁面程式碼（現有元件已大致符合盤點出的標準）
- Proposal 中列出目前少數不完全符合標準的既有用法，作為後續調整的追蹤項（不在本次 tasks 中處理程式碼變更）

## Capabilities

### New Capabilities

- `ui-components`: 定義 Card 容器（AppCard/DialogCard vs 裸 v-card）、Button（AppButton/IconActionBtn vs 裸 v-btn）、Data Table（headers/no-data/monospace/actions 欄位）的標準使用規範與允許例外

### Modified Capabilities

（無，`vuetify-theme` spec 的 color token / monospace 規則維持不變，`ui-components` spec 僅在 data table 的 monospace 需求上引用既有規則，不重複定義）

## Impact

- 受影響範圍：`openspec/specs/ui-components/spec.md`（新增文件）
- 不涉及程式碼變更；`components/cards/*`、`components/buttons/*`、各頁面 `v-data-table` 用法均維持現狀
- 後續若要修正不符合標準的既有用法，需另開 change proposal
