export const Permission = {
  Users: {
    Read: 'users:read',
    Write: 'users:write',
    Create: 'users:create',
    Delete: 'users:delete',
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
} as const;

type NestedValues<T> = T extends string ? T : { [K in keyof T]: NestedValues<T[K]> }[keyof T];

export type Permission = NestedValues<typeof Permission>;

export const PermissionMeta: Record<Permission, string> = {
  'users:read': '讀取會員資料',
  'users:write': '寫入會員資料',
  'users:create': '建立會員帳號',
  'users:delete': '刪除會員帳號',
  'roles:read': '讀取角色',
  'roles:write': '編輯角色權限',
  'permissions:read': '讀取權限清單',
  'login_logs:read': '讀取登入紀錄',
  'audit_logs:read': '讀取稽核紀錄',
};
