## Context

現有頁面已對 Card、Button、Data Table 的用法形成一致慣例（透過 `components/cards/AppCard.vue`、`components/cards/DialogCard.vue`、`components/buttons/AppButton.vue`、`components/buttons/IconActionBtn.vue`），但這些慣例僅存在於程式碼中，未被寫成規範。本次僅是把既有慣例文件化為 `ui-components` spec，不涉及新架構或程式碼變更。

## Goals / Non-Goals

**Goals:**

- 明確定義 Card 容器、Button、Data Table 三類元件的標準使用方式
- 明確列出允許使用裸 Vuetify 元件的例外情境，避免規範過度僵化
- 與既有 `vuetify-theme` spec（color token、monospace 字型）保持一致，不重複定義

**Non-Goals:**

- 不新增或修改任何 Vue 元件
- 不調整既有頁面以符合規範（不符合規範的既有用法留待後續 change 處理）
- 不涵蓋 Card/Button/DataTable 以外的其他 Vuetify 元件（如 v-select、v-text-field）

## Decisions

- **新增獨立 spec `ui-components`，不併入 `vuetify-theme`**：`vuetify-theme` 專注於 color token 與字型規則，`ui-components` 專注於元件使用結構與例外規則，職責分離，未來各自演進較不易互相干擾。
- **以「容器角色」而非「元件名稱」界定規則邊界**：例如 FilterBar 的 popover v-card、layout 的 icon-only v-btn 屬於「浮層/佈局控制」而非「頁面內容/業務操作」，因此明確列為例外，而非要求全面禁止裸 Vuetify 元件。
- **本次不修正既有不合規用法**：目前程式碼已高度一致，少數例外都有清楚理由；貿然一併修改會擴大變更範圍且不在使用者本次請求範圍內。

## Risks / Trade-offs

- [新規範可能與未來新增的元件用法衝突] → 若後續出現新的合理例外（如新的浮層元件），需再開 change 更新 `ui-components` spec，而非直接違反規範硬寫
- [規範文件與程式碼可能隨時間漂移] → code review 時應對照本 spec 檢查新增的 Card/Button/DataTable 用法
