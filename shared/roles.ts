import { Permission } from './permissions';

export const Role = {
  SuperAdmin: 'superadmin',
  Admin: 'admin',
  Member: 'member',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const RoleMeta: Record<Role, string> = {
  superadmin: '超級管理員',
  admin: '管理員',
  member: '一般會員',
};

export const RolePermissions: Record<Role, Permission[]> = {
  superadmin: [],
  admin: [
    Permission.Dashboard.Read,
    Permission.Users.Read,
    Permission.Users.Write,
    Permission.Users.Create,
    Permission.Users.Delete,
    Permission.Roles.Read,
    Permission.Roles.Write,
    Permission.Permissions.Read,
    Permission.LoginLogs.Read,
    Permission.AuditLogs.Read,
  ],
  member: [Permission.Users.Read],
};
