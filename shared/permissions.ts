export const Permission = {
  Users: {
    Read: 'users:read',
    Write: 'users:write',
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
