# saas-starter-kit

Nuxt 3 + Firebase 打造的 SaaS 後台起始模板，SPA 架構、內建 RBAC 與管理後台。

## 特色

- **完整登入機制**：username/password（主要）、Google 登入、手機 OTP 驗證，支援多登入方式綁定同一帳號
- **Hybrid RBAC 權限系統**：角色（superadmin / admin / member）決定身分，`resource:action` 權限細粒度控管操作，權限可在後台動態調整
- **管理後台**：使用者管理、角色與權限設定、登入紀錄、稽核紀錄，皆受權限保護
- **環境隔離**：Firestore collection 依環境（dev/prod）加上前綴，同一專案可安全共用
- **多語系（i18n）**：內建繁體中文 / 英文切換
- **統一錯誤與通知體驗**：API 錯誤訊息在地化，全域 Toast 通知系統
- **個人資料自助服務**：使用者可自行編輯基本資料、綁定/解除 Google 帳號、完成手機驗證
- **一致的分層架構**：`api/` thin handler → `service` 業務邏輯 → `repo` Firestore 存取，模組間僅透過 `index.ts` 互相依賴
