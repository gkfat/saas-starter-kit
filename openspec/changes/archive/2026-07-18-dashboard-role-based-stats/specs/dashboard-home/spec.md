## ADDED Requirements

### Requirement: 登入後首頁顯示三張統計卡片

系統 SHALL 在 `pages/dashboard/index.vue` 顯示三張獨立卡片元件：使用者總覽、使用者成長、活躍使用者。此頁面僅具備 `dashboard:read` 權限的使用者可造訪（見「Dashboard 存取受 dashboard:read 權限保護」需求），故不需依角色分流頁面內容。

#### Scenario: superadmin 檢視首頁

- **WHEN** role 為 `superadmin` 的使用者登入後導向 `/dashboard`
- **THEN** 頁面顯示使用者總覽、使用者成長、活躍使用者三張卡片

#### Scenario: admin 檢視首頁

- **WHEN** role 為 `admin` 的使用者登入後導向 `/dashboard`
- **THEN** 頁面顯示使用者總覽、使用者成長、活躍使用者三張卡片

### Requirement: Dashboard 存取受 dashboard:read 權限保護

系統 SHALL 定義 `dashboard:read` 權限：`superadmin` 透過既有權限 bypass 機制自動具備，`admin` SHALL 具備此權限，`member` SHALL 不具備。使用者造訪 `/dashboard` 時，系統 SHALL 檢查呼叫者是否具備 `dashboard:read` 權限；不具備者 SHALL 被導向 `/profile`，不得顯示 `/dashboard` 頁面的任何內容。

#### Scenario: superadmin 造訪首頁

- **WHEN** role 為 `superadmin` 的使用者造訪 `/dashboard`
- **THEN** 系統允許顯示 `/dashboard` 頁面內容

#### Scenario: admin 造訪首頁

- **WHEN** role 為 `admin` 的使用者造訪 `/dashboard`
- **THEN** 系統允許顯示 `/dashboard` 頁面內容

#### Scenario: member 造訪首頁被導向

- **WHEN** role 為 `member`（不具備 `dashboard:read` 權限）的使用者造訪 `/dashboard`
- **THEN** 系統導向 `/profile`，不顯示 `/dashboard` 頁面內容、不呼叫統計 API

### Requirement: 使用者總覽卡片顯示會員組成人數

系統 SHALL 提供「使用者總覽」卡片，內容包含總會員數、啟用中／新註冊／已停用三種狀態的人數，以及依角色（`admin`／`member`）分組的人數，皆不計入 superadmin 帳號。狀態分類 SHALL 依序判斷：`disabled` 為真者計入「已停用」；否則 `passwordSetupPending` 為真者計入「新註冊」；其餘計入「啟用中」。

#### Scenario: 卡片顯示總會員數與狀態分佈

- **WHEN** superadmin 或 admin 開啟 `/dashboard`
- **THEN** 使用者總覽卡片顯示總會員數，以及啟用中、新註冊、已停用三個人數，三者加總 SHALL 等於總會員數

#### Scenario: 卡片顯示各角色人數

- **WHEN** superadmin 或 admin 開啟 `/dashboard`
- **THEN** 使用者總覽卡片顯示 `admin` 與 `member` 兩個角色各自的人數，兩者加總 SHALL 等於總會員數

### Requirement: 使用者成長卡片顯示日曆區間新增人數

系統 SHALL 提供「使用者成長」卡片，內容包含今日、本週、本月新增會員數（依 `createdAt` 落在對應日曆區間內計算，`superadmin` 不計入），區間起點分別為當日、當週、當月的起始時刻。

#### Scenario: 卡片顯示今日／本週／本月新增人數

- **WHEN** superadmin 或 admin 開啟 `/dashboard`
- **THEN** 使用者成長卡片顯示今日新增、本週新增、本月新增三個人數

### Requirement: 活躍使用者卡片顯示 DAU/WAU/MAU 與登入次數

系統 SHALL 提供「活躍使用者」卡片，內容包含：

- DAU：`lastLoginAt` 落在今日內的會員數（不計入 superadmin）
- WAU：`lastLoginAt` 落在近 7 天內的會員數（不計入 superadmin）
- MAU：`lastLoginAt` 落在近 30 天內的會員數（不計入 superadmin）
- 今日登入次數：依 `result` 分為成功與失敗兩個數字；若登入紀錄功能（`FeatureFlag.LoginLog`）未啟用，成功與失敗數 SHALL 皆回傳 `0`
- 活躍率：MAU 除以總會員數（不計入 superadmin）；總會員數為 `0` 時活躍率 SHALL 回傳 `0`

#### Scenario: 卡片顯示 DAU/WAU/MAU 與今日登入次數

- **WHEN** superadmin 或 admin 開啟 `/dashboard`
- **THEN** 活躍使用者卡片顯示 DAU、WAU、MAU、今日登入成功次數、今日登入失敗次數、活躍率

#### Scenario: 登入紀錄功能關閉時登入次數回傳 0

- **WHEN** `FeatureFlag.LoginLog` 未啟用
- **THEN** 活躍使用者卡片顯示的今日登入成功與失敗次數皆為 `0`，且不因缺少登入紀錄資料而報錯

### Requirement: 統計卡片每 60 秒自動刷新

系統 SHALL 在 `/dashboard` 頁面掛載期間，每 60 秒重新呼叫 `GET /api/dashboard/stats` 以更新三張卡片顯示的數字；頁面卸載時 SHALL 清除輪詢排程，不得繼續觸發請求。

#### Scenario: 停留頁面超過 60 秒

- **WHEN** superadmin 或 admin 停留在 `/dashboard` 超過 60 秒
- **THEN** 系統再次呼叫 `GET /api/dashboard/stats` 並更新三張卡片的數字

#### Scenario: 離開頁面後不再輪詢

- **WHEN** 使用者離開 `/dashboard`（頁面卸載）
- **THEN** 系統清除 60 秒輪詢的計時器，不再呼叫 `GET /api/dashboard/stats`

### Requirement: 統計 API 回傳完整儀表板資料並受權限保護

系統 SHALL 提供 `GET /api/dashboard/stats`，回傳：

```
{
  userOverview: {
    total: number; active: number; pendingPassword: number; disabled: number;
    byRole: { admin: number; member: number };
  };
  userGrowth: { today: number; thisWeek: number; thisMonth: number };
  activeUsers: {
    dau: number; wau: number; mau: number;
    todayLogins: { success: number; failure: number };
    activeRate: number;
  };
}
```

此端點 SHALL 要求呼叫者同時具備 `users:read` 與 `login_logs:read` 權限，缺少任一權限 SHALL 回傳 403。所有人數統計 SHALL 排除 superadmin 帳號。

#### Scenario: 具備權限的呼叫回傳完整統計資料

- **WHEN** 具備 `users:read` 與 `login_logs:read` 權限的使用者呼叫 `GET /api/dashboard/stats`
- **THEN** 系統回傳 `userOverview`、`userGrowth`、`activeUsers` 三個區塊的完整統計資料

#### Scenario: 缺少權限的呼叫被拒絕

- **WHEN** 不具備 `users:read` 或不具備 `login_logs:read` 權限的使用者呼叫 `GET /api/dashboard/stats`
- **THEN** 系統回傳 403 並且不回傳任何統計資料
