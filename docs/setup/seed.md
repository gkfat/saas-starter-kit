# Seed 說明

初始化一個新環境需要依序執行兩個 seed script：

1. **RBAC seed** — 建立 Firestore 內的 roles / permissions 結構
2. **Superadmin seed** — 建立 Firebase Auth superadmin 帳號

---

## 前置條件

`.env` 必須已填入 Firebase Admin SDK 憑證：

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

預設 tenant 為 `default`，可透過環境變數覆蓋：

```env
TENANT_ID=my-tenant
```

> Runtime 的 `tenantId` 從 Firebase Auth token claims 動態解析，`TENANT_ID` 僅供 seed scripts 使用。

---

## 1. Seed RBAC

建立 Firestore 內的預設 roles、permissions 與 role_permissions 對應關係。

```bash
pnpm seed:rbac
```

**建立的資料（tenant: `default`）：**

| 類型            | 名稱                                        |
| --------------- | ------------------------------------------- |
| Permission      | `users:read`、`users:write`、`admin:access` |
| Role            | `admin`、`member`                           |
| Role-Permission | `admin` → 全部；`member` → `users:read`     |

此 script 具備冪等性（重複執行會覆寫相同資料，不會重複建立）。

---

## 2. Seed Superadmin

在 Firebase Auth 建立 superadmin 帳號，並設定 custom claims `{ role: 'superadmin' }`。

在 `.env` 補上：

```env
SUPERADMIN_EMAIL=
SUPERADMIN_PASSWORD=
```

> `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` 僅供此 script 使用，不進入 Nuxt runtimeConfig，也不會部署到伺服器。

執行：

```bash
pnpm seed:superadmin
```

**行為說明：**

| 情境                     | 結果                               |
| ------------------------ | ---------------------------------- |
| 帳號不存在               | 建立帳號並設定 claims，輸出 `[OK]` |
| 帳號已存在且 claims 正確 | 跳過，輸出 `[SKIP]` 警告           |
| 帳號已存在但 claims 不符 | 拋出錯誤，不修改現有帳號           |

Superadmin 身份**僅透過 Firebase Auth custom claims 辨識**，不寫入 Firestore。每個 tenant 限一組。

---

## 3. Seed Demo Users

建立兩組示範帳號，分別對應 `admin` 與 `member` role，適用於開發與展示環境。

```bash
pnpm seed:demo-users
```

**建立的帳號：**

| Email           | Password | Role   |
| --------------- | -------- | ------ |
| admin@demo.com  | demo1234 | admin  |
| member@demo.com | demo1234 | member |

**行為說明：**

| 情境            | 結果                                                       |
| --------------- | ---------------------------------------------------------- |
| 帳號不存在      | 建立 Firebase Auth 帳號並寫入 Firestore users / user_roles |
| Auth 帳號已存在 | 跳過建立，輸出 `[SKIP]`；Firestore 資料仍會 upsert         |

> 勿在正式環境執行此 script。

Demo 帳號建立時 `providers` 皆為 `['password']`，尚未綁定 Google。可用來測試 Profile 頁面的 Google 綁定流程（見下方說明）。

---

## 測試 Google Provider 綁定（Profile 頁面）

以任一帳號（demo 帳號或自行註冊的帳號）登入後，至 `/profile` 頁面：

1. 若帳號尚未綁定 Google，會顯示「綁定 Google 帳號」按鈕
2. 點擊後跳出 Google 登入彈窗，完成登入即完成綁定
3. 綁定成功後該帳號的 Firestore `users/{uid}` 文件 `providers` 陣列會加入 `'google'`
4. 綁定不會檢查或覆蓋既有的 `email` 欄位，也不要求 Google 帳號的 email 與已綁定的 email 相同
5. 若該 Google 帳號已綁定至其他 Firebase Auth 帳號，Firebase 會回傳 `auth/credential-already-in-use` 錯誤，畫面顯示綁定失敗

> 此綁定流程與登入頁「以 Google 繼續」的自動綁定邏輯不同：登入頁流程要求 Google email 與帳號已綁定的 email 一致，Profile 頁面的主動綁定則不做此檢查。

---

## 執行順序

```
pnpm seed:rbac
pnpm seed:superadmin
pnpm seed:demo-users   # 開發 / 展示環境選用
```

完成後即可以 `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` 登入後台，或使用 demo 帳號測試一般功能。
