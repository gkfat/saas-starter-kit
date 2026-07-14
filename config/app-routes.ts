import { Permission } from '~/shared/permissions';

export type RouteItem = {
  title: string;
  icon: string;
  path?: string;
  permission?: Permission;
  exact?: boolean;
  children?: RouteItem[];
};

export type RouteGroup = {
  label: string;
  items: RouteItem[];
};

export const APP_ROUTES: RouteGroup[] = [
  {
    label: 'General',
    items: [
      {
        title: 'Dashboard',
        icon: 'mdi-view-dashboard',
        path: '/dashboard',
        exact: true,
      },
      {
        title: 'Profile',
        icon: 'mdi-account-circle',
        path: '/profile',
        exact: true,
      },
    ],
  },
  {
    label: 'Management',
    items: [
      {
        title: 'Users',
        icon: 'mdi-account-group',
        path: '/admin/users',
        permission: Permission.Users.Read,
      },
      {
        title: 'Roles',
        icon: 'mdi-shield-account',
        path: '/admin/roles',
        permission: Permission.Roles.Read,
      },
      {
        title: 'Permissions',
        icon: 'mdi-key-variant',
        path: '/iam/permissions',
        permission: Permission.Permissions.Read,
      },
    ],
  },
  {
    label: 'Logs',
    items: [
      {
        title: 'Login Logs',
        icon: 'mdi-login',
        path: '/admin/logs/login',
        exact: true,
        permission: Permission.LoginLogs.Read,
      },
      {
        title: 'Audit Logs',
        icon: 'mdi-history',
        path: '/admin/logs/audit',
        exact: true,
        permission: Permission.AuditLogs.Read,
      },
    ],
  },
];

export function flattenRoutePermissions(): { prefix: string; permission: Permission }[] {
  const result: { prefix: string; permission: Permission }[] = [];

  for (const group of APP_ROUTES) {
    for (const item of group.items) {
      if (item.permission && item.path) {
        result.push({ prefix: item.path, permission: item.permission });
      }

      for (const child of item.children ?? []) {
        if (child.permission && child.path) {
          result.push({ prefix: child.path, permission: child.permission });
        }
      }
    }
  }

  return result;
}
