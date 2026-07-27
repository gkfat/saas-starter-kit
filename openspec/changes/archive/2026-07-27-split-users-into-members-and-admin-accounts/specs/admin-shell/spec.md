## MODIFIED Requirements

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

- **WHEN** 登入使用者具備 `admin:access` 權限，但僅擁有 `members:read`（不具 `admin-accounts:read`）
- **THEN** Management 群組 SHALL 顯示「會員管理」項目，SHALL NOT 顯示「後台帳號管理」項目

#### Scenario: Sidebar 底部顯示使用者資訊與登出

- **WHEN** 使用者已登入
- **THEN** sidebar 底部 SHALL 顯示使用者 displayName / email 與登出按鈕
