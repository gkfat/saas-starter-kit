import { Permission } from './permissions';

export const Role = {
  Admin: 'admin',
  Member: 'member',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const RoleMeta: Record<Role, string> = {
  admin: '管理員',
  member: '一般會員',
};

export const RolePermissions: Record<Role, Permission[]> = {
  admin: [
    Permission.Users.Read,
    Permission.Users.Write,
    Permission.Roles.Read,
    Permission.Roles.Write,
    Permission.Permissions.Read,
    Permission.LoginLogs.Read,
    Permission.AuditLogs.Read,
  ],
  member: [Permission.Users.Read],
};
