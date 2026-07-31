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
    Permission.Members.Read,
    Permission.Members.Write,
    Permission.Members.Create,
    Permission.Members.Delete,
    Permission.AdminAccounts.Read,
    Permission.AdminAccounts.Write,
    Permission.AdminAccounts.Create,
    Permission.AdminAccounts.Delete,
    Permission.Roles.Read,
    Permission.Roles.Write,
    Permission.Permissions.Read,
    Permission.LoginLogs.Read,
    Permission.AuditLogs.Read,
  ],
  member: [],
};
