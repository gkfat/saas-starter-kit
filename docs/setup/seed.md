# Seed 說明

初始化一個新環境需要依序執行兩個 seed script：

1. **RBAC seed** — 建立 Firestore 內的 roles / permissions 結構
2. **Superadmin seed** — 建立 Firebase Auth superadmin 帳號

---

## 環境變數檔案

`scripts/seed-*.ts` **不讀取** root 的 `.env`（那份只給 3 個 app 的 dev server 用），改由 `scripts/load-env.ts` 讀取 `scripts/env/` 資料夾下的檔案，分成「共用」與「dev/prod 各自」兩層：

| 檔案                    | 內容                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| `scripts/env/.env`      | dev / prod **共用**的變數（`FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY`） |
| `scripts/env/.env.dev`  | 只有 dev 需要的變數（`APP_ENV=development`、dev 專用的 `SUPERADMIN_*`）     |
| `scripts/env/.env.prod` | 只有 prod 需要的變數（`APP_ENV=production`、prod 專用的 `SUPERADMIN_*`）    |

三個 seed script（`seed:rbac` / `seed:superadmin` / `seed:demo-users`）跑 dev 版時載入順序是 `scripts/env/.env.dev` → `scripts/env/.env`；`:prod` 版是 `scripts/env/.env.prod` → `scripts/env/.env`。**同一個 key 兩邊都有時，dev/prod 專屬檔案優先**（dotenv 遇到重複 key 保留先載入的值）。載入哪一組由 `SEED_ENV` 環境變數決定（`SEED_ENV=prod` 才讀 prod，其餘一律當 dev），已內建在對應的 pnpm script 裡，不需要手動設定。若缺任一份檔案，`scripts/load-env.ts` 會直接丟出錯誤並提示要複製哪個 `.example`。

依序複製並填入：

```bash
cp scripts/env/.env.example scripts/env/.env
cp scripts/env/.env.dev.example scripts/env/.env.dev
cp scripts/env/.env.prod.example scripts/env/.env.prod
```

```env
# scripts/env/.env（共用）
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# scripts/env/.env.dev
APP_ENV=development
SUPERADMIN_USERNAME=
SUPERADMIN_PASSWORD=

# scripts/env/.env.prod
APP_ENV=production
SUPERADMIN_USERNAME=
SUPERADMIN_PASSWORD=
```

> dev 與 prod 目前共用**同一個** Firebase 專案，僅靠 `APP_ENV` 控制 Firestore collection prefix（`dev_` / `prod_`，見 `apps/server/server/shared/firestore-prefix.ts`）區隔資料，所以 Admin SDK 憑證放在共用的 `scripts/env/.env` 即可，不用兩邊各存一份。
>
> **superadmin 例外**：superadmin 身份只透過 Firebase Auth custom claims 辨識，**不吃 `APP_ENV` prefix**。因此 `scripts/env/.env.dev` 與 `scripts/env/.env.prod` 的 `SUPERADMIN_USERNAME` 務必用不同帳號，否則兩邊會共用同一個 Firebase Auth 帳號；即使用不同帳號，dev 建立的 superadmin 帳號理論上仍可登入 prod 部署的 admin（因為兩邊指向同一個專案），這是目前架構下已知、可接受的限制。

`scripts/env/.env`、`scripts/env/.env.dev`、`scripts/env/.env.prod` 已在 `.gitignore` 的 `.env` / `.env.*` 規則中被排除，不會進版控；只有對應的 `.example` 檔會被追蹤。

## CI/CD 不受影響

`.github/workflows/deploy.yml` 部署 server / admin / liff 時，環境變數是直接從 GitHub Secrets 注入（`env:` 區塊、Cloud Run `--env-vars-file` / `--set-secrets`），完全不讀取任何 `.env*` 檔案，所以這裡的調整不影響 CI/CD。`scripts/env/` 資料夾只在本機執行 `pnpm seed:*` 時才會用到。

---

## 1. Seed RBAC

建立 Firestore 內的預設 roles、permissions 與 role_permissions 對應關係。

```bash
pnpm seed:rbac
```

**建立的資料：**

| 類型            | 名稱                                        |
| --------------- | ------------------------------------------- |
| Permission      | `users:read`、`users:write`、`admin:access` |
| Role            | `admin`、`member`                           |
| Role-Permission | `admin` → 全部；`member` → `users:read`     |

此 script 具備冪等性（重複執行會覆寫相同資料，不會重複建立）。

---

## 2. Seed Superadmin

在 Firebase Auth 建立 superadmin 帳號（登入方式為 `SUPERADMIN_USERNAME` + `SUPERADMIN_PASSWORD`，帳號的合成 email 為 `{username}@internal.local`），並設定 custom claims `{ role: 'superadmin' }`。

```bash
pnpm seed:superadmin
```

**行為說明：**

| 情境       | 結果                                                         |
| ---------- | ------------------------------------------------------------ |
| 帳號不存在 | 建立帳號並設定 claims，輸出 `[OK]`                           |
| 帳號已存在 | 無條件跳過，輸出 `[SKIP]`，**不會**檢查 claims、不會重設密碼 |

> 注意：目前 script 實作只要 email 存在就跳過，不會檢查既有帳號的 claims 是否正確，也不會套用 `.env` 裡新填的密碼。若要改用同一個 `SUPERADMIN_USERNAME` 重跑此 script 更新密碼，必須先手動刪除 Firebase Auth 裡的舊帳號。

Superadmin 身份**僅透過 Firebase Auth custom claims 辨識**，不寫入 Firestore。

---

## 3. Seed Demo Users

建立兩組示範帳號，分別對應 `admin` 與 `member` role，適用於開發與展示環境。

```bash
pnpm seed:demo-users
```

**建立的帳號：**

| Username   | Password | Role   |
| ---------- | -------- | ------ |
| demoadmin  | demo1234 | admin  |
| demomember | demo1234 | member |

**行為說明：**

| 情境            | 結果                                                       |
| --------------- | ---------------------------------------------------------- |
| 帳號不存在      | 建立 Firebase Auth 帳號並寫入 Firestore users / user_roles |
| Auth 帳號已存在 | 跳過建立，輸出 `[SKIP]`                                    |

> 勿在正式環境執行此 script — 沒有 `seed:demo-users:prod`，只能用 `scripts/env/.env.dev`。

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

## 執行順序（開發環境）

```bash
pnpm seed:rbac
pnpm seed:superadmin
pnpm seed:demo-users   # 開發 / 展示環境選用
```

完成後即可以 `scripts/env/.env.dev` 裡的 `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` 登入後台，或使用 demo 帳號測試一般功能。

---

## 執行順序（正式環境）

```bash
pnpm seed:rbac:prod
pnpm seed:superadmin:prod
```

完成後以 `scripts/env/.env.prod` 裡的 `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` 登入後台。
