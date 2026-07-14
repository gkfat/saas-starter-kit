export type RouteItem = {
  title: string;
  icon: string;
  path?: string;
  permission?: string;
  exact?: boolean;
  children?: RouteItem[];
};

export type RouteGroup = {
  label: string;
  permission?: string;
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
    permission: 'admin:access',
    items: [
      {
        title: 'Users',
        icon: 'mdi-account-group',
        path: '/admin/users',
      },
      {
        title: 'Roles',
        icon: 'mdi-shield-account',
        path: '/admin/roles',
      },
      {
        title: 'Permissions',
        icon: 'mdi-key-variant',
        path: '/iam/permissions',
      },
    ],
  },
  {
    label: 'Logs',
    permission: 'admin:access',
    items: [
      {
        title: 'Login Logs',
        icon: 'mdi-login',
        path: '/admin/logs/login',
        exact: true,
      },
      {
        title: 'Audit Logs',
        icon: 'mdi-history',
        path: '/admin/logs/audit',
        exact: true,
      },
    ],
  },
];

export function flattenRoutePermissions(): { prefix: string; permission: string }[] {
  const result: { prefix: string; permission: string }[] = [];

  for (const group of APP_ROUTES) {
    const effectivePermission = group.permission;

    for (const item of group.items) {
      const permission = item.permission ?? effectivePermission;
      if (!permission) continue;

      if (item.path) {
        result.push({ prefix: item.path, permission });
      }

      for (const child of item.children ?? []) {
        const childPermission = child.permission ?? permission;
        if (child.path) {
          result.push({ prefix: child.path, permission: childPermission });
        }
      }
    }
  }

  return result;
}
