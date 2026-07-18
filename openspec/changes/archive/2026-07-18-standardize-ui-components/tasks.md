## 1. Spec 驗證

- [x] 1.1 執行 `openspec validate standardize-ui-components --strict`，確認 spec delta 格式正確
- [x] 1.2 對照 `openspec/specs/vuetify-theme/spec.md`，確認 monospace 規則未被重複定義或衝突

## 2. 歸檔

- [x] 2.1 確認無程式碼變更需求後，執行 archive 將 `ui-components` spec 併入 `openspec/specs/`

## 3. 後續追蹤（不在本 change 範圍內，僅記錄）

- [ ] 3.1 盤點是否仍有頁面直接使用裸 `v-card`/`v-btn` 而非共用元件，若有則另開 change 修正
