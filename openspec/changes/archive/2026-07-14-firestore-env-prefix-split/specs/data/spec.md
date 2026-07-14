## MODIFIED Requirements

### Requirement: Firestore collection 路徑結構

所有 Firestore collection 名稱 SHALL 包含環境前綴（`dev_` 或 `prod_`），完整路徑為：

```
tenants/{tenantId}/
  ├── {prefix}users/{userId}
  ├── {prefix}roles/{roleId}
  ├── {prefix}permissions/{permissionId}
  ├── {prefix}role_permissions/{rolePermissionId}
  ├── {prefix}user_roles/{userRoleId}
  ├── {prefix}audit_logs/{logId}
  └── {prefix}login_logs/{logId}
```

其中 `{prefix}` 由 `prefixCollection()` 決定（`dev_` 或 `prod_`）。

- `tenantId` 來自 Firebase Auth custom claims
- 未設定時預設為 `'default'`
- 每個 Firestore query 必須包含 `tenantId` filter

#### Scenario: 開發環境 collection 路徑

- **WHEN** `APP_ENV` 未設定（本機開發）
- **THEN** Firestore 存取路徑為 `tenants/{tenantId}/dev_{collection}/{docId}`

#### Scenario: 正式環境 collection 路徑

- **WHEN** `APP_ENV=production`
- **THEN** Firestore 存取路徑為 `tenants/{tenantId}/prod_{collection}/{docId}`
