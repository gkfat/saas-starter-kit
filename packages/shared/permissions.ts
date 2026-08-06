export const Permission = {
  Dashboard: {
    Read: 'dashboard:read',
  },
  Members: {
    Read: 'members:read',
    Write: 'members:write',
    Create: 'members:create',
    Delete: 'members:delete',
  },
  AdminAccounts: {
    Read: 'admin_accounts:read',
    Write: 'admin_accounts:write',
    Create: 'admin_accounts:create',
    Delete: 'admin_accounts:delete',
  },
  Roles: {
    Read: 'roles:read',
    Write: 'roles:write',
  },
  Permissions: {
    Read: 'permissions:read',
  },
  LoginLogs: {
    Read: 'login_logs:read',
  },
  AuditLogs: {
    Read: 'audit_logs:read',
  },
  LevelTiers: {
    Read: 'level_tiers:read',
    Write: 'level_tiers:write',
  },
} as const;

type NestedValues<T> = T extends string ? T : { [K in keyof T]: NestedValues<T[K]> }[keyof T];

export type Permission = NestedValues<typeof Permission>;

export const PermissionMeta: Record<Permission, string> = {
  'dashboard:read': '讀取儀表板統計',
  'members:read': '讀取會員資料',
  'members:write': '寫入會員資料',
  'members:create': '建立會員帳號',
  'members:delete': '刪除會員帳號',
  'admin_accounts:read': '讀取後台帳號資料',
  'admin_accounts:write': '寫入後台帳號資料',
  'admin_accounts:create': '建立後台帳號',
  'admin_accounts:delete': '刪除後台帳號',
  'roles:read': '讀取角色',
  'roles:write': '編輯角色權限',
  'permissions:read': '讀取權限清單',
  'login_logs:read': '讀取登入紀錄',
  'audit_logs:read': '讀取稽核紀錄',
  'level_tiers:read': '讀取等級級距表',
  'level_tiers:write': '編輯等級級距表',
};
