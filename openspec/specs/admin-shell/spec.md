# Spec: Admin Shell

## Purpose

Admin UI 的全域 shell 結構，定義 sidebar 導航、mobile 導航、Breadcrumb 與 PageHeader component 的行為規範。

---

## Requirements

### Requirement: Sidebar 整合導航與使用者操作

Admin UI 的側邊 sidebar SHALL 作為唯一的全域導航容器，包含 project name、群組導航項目、使用者資訊與登出按鈕。系統 SHALL NOT 顯示獨立的頂部 AppHeader。

#### Scenario: Sidebar 顯示 project name

- **WHEN** 使用者進入任何 Admin 頁面
- **THEN** sidebar 頂部 SHALL 顯示 "saas-starter-kit" 文字

#### Scenario: Sidebar 顯示導航群組

- **WHEN** 使用者進入 Admin 頁面
- **THEN** sidebar SHALL 顯示 General（Dashboard、Profile）、Management（會員管理、後台帳號管理、Roles）、Logs（Login Logs、Audit Logs）三個群組，各有 subheader 分隔

#### Scenario: 無 admin:access 權限時隱藏 Management 與 Logs

- **WHEN** 登入使用者無 `admin:access` 權限
- **THEN** sidebar SHALL 隱藏 Management 與 Logs 群組

#### Scenario: Management 群組項目依權限個別顯示

- **WHEN** 登入使用者具備 `admin:access` 權限，但僅擁有 `members:read`（不具 `admin_accounts:read`）
- **THEN** Management 群組 SHALL 顯示「會員管理」項目，SHALL NOT 顯示「後台帳號管理」項目

#### Scenario: Sidebar 底部顯示使用者資訊與登出

- **WHEN** 使用者已登入
- **THEN** sidebar 底部 SHALL 顯示使用者 displayName / email 與登出按鈕

---

### Requirement: Sidebar Collapse/Expand 切換（桌面）

桌面寬度下，sidebar SHALL 支援 rail mode（icon-only，寬 56px）與 expanded mode（icon+label，寬 256px）的切換，狀態 SHALL 跨頁面持久化。Mobile 寬度下 sidebar 以 temporary overlay 模式呈現，不支援 rail mode。

#### Scenario: 切換至 icon-only（桌面）

- **WHEN** 桌面使用者點擊 sidebar 底部的 toggle 按鈕
- **THEN** sidebar SHALL 收縮至 56px 寬，僅顯示 icon，label 與 subheader 隱藏

#### Scenario: 切換回 expanded（桌面）

- **WHEN** 桌面使用者再次點擊 toggle 按鈕
- **THEN** sidebar SHALL 展開至 256px，顯示 icon + label + subheader

#### Scenario: 狀態跨頁面持久化

- **WHEN** 使用者在 collapsed 狀態下跳轉頁面
- **THEN** sidebar SHALL 維持 collapsed 狀態

---

### Requirement: Mobile 導航

Mobile 寬度下，系統 SHALL 顯示頂部 AppBar（含 hamburger 按鈕與專案名稱），sidebar 以 temporary overlay 方式開啟，導覽至頁面後自動關閉。

#### Scenario: Mobile AppBar 顯示

- **WHEN** 使用者在 mobile 寬度瀏覽
- **THEN** 頂部 SHALL 顯示 AppBar 含 hamburger icon

#### Scenario: Sidebar overlay 開啟

- **WHEN** 使用者點擊 hamburger 按鈕
- **THEN** sidebar SHALL 以 overlay 方式滑出覆蓋在內容上方

#### Scenario: 導覽後自動關閉

- **WHEN** 使用者在 mobile sidebar 點擊任一導覽項目
- **THEN** sidebar SHALL 自動關閉，顯示目標頁面內容

---

### Requirement: Breadcrumb Component

系統 SHALL 提供獨立的 `Breadcrumb` component，自動從當前路由路徑生成麵包屑，字體小於正文，顯示至最後一個 path segment。

#### Scenario: 自動生成 breadcrumb

- **WHEN** 使用者在 `/admin/logs/login`
- **THEN** Breadcrumb SHALL 顯示 "Admin / Logs / Login"，前兩節可點擊跳轉

#### Scenario: 最後一節不可點擊

- **WHEN** breadcrumb 顯示當前頁面節點
- **THEN** 最後一個 segment SHALL 不帶連結

---

### Requirement: PageHeader Component

系統 SHALL 提供 `PageHeader` component，接受 `title` prop，顯示頁面標題於各頁面主內容區。

#### Scenario: 顯示頁面標題

- **WHEN** 頁面傳入 `title="Users"`
- **THEN** PageHeader SHALL 顯示 "Users" 為頁面標題（text-h5 層級）

---

### Requirement: Admin 管理頁面整合 Breadcrumb + PageHeader

所有頁面（Dashboard、Profile、Users、Roles、Permissions、Login Logs、Audit Logs）SHALL 使用 Breadcrumb 顯示路由路徑、PageHeader 顯示頁面標題。

#### Scenario: 所有頁面顯示 breadcrumb 與標題

- **WHEN** 使用者進入任意 Admin 頁面
- **THEN** 頁面頂部 SHALL 顯示 Breadcrumb（路由路徑）與 PageHeader（頁面標題）
