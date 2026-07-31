import { FeatureFlag, Permission } from '@saas-starter-kit/shared';

export type RouteItem = {
  title: string;
  icon: string;
  path?: string;
  permission?: Permission;
  redirectTo?: string;
  featureFlag?: FeatureFlag;
  exact?: boolean;
  public?: boolean;
  children?: RouteItem[];
};

export type RouteGroup = {
  label?: string;
  items: RouteItem[];
};

export const APP_ROUTES: RouteGroup[] = [
  {
    items: [
      { title: 'nav.home', icon: 'mdi-home-outline', path: '/home', public: true },
      {
        title: 'nav.dashboard',
        icon: 'mdi-view-dashboard',
        path: '/dashboard',
        exact: true,
        permission: Permission.Dashboard.Read,
        redirectTo: '/profile',
      },
      {
        title: 'nav.profile',
        icon: 'mdi-account-circle',
        path: '/profile',
        exact: true,
      },
    ],
  },
  {
    label: 'nav.groupManagement',
    items: [
      {
        title: 'nav.members',
        icon: 'mdi-account-multiple',
        path: '/admin/members',
        permission: Permission.Members.Read,
      },
      {
        title: 'nav.adminAccounts',
        icon: 'mdi-account-tie',
        path: '/admin/admin-accounts',
        permission: Permission.AdminAccounts.Read,
      },
      {
        title: 'nav.loginLogs',
        icon: 'mdi-login',
        path: '/admin/logs/login',
        exact: true,
        permission: Permission.LoginLogs.Read,
        featureFlag: FeatureFlag.LoginLog,
      },
      {
        title: 'nav.auditLogs',
        icon: 'mdi-history',
        path: '/admin/logs/audit',
        exact: true,
        permission: Permission.AuditLogs.Read,
        featureFlag: FeatureFlag.AuditLog,
      },
    ],
  },
  {
    label: 'nav.groupIam',
    items: [
      {
        title: 'nav.adminRoles',
        icon: 'mdi-shield-account',
        path: '/iam/roles',
        permission: Permission.Roles.Read,
      },
      {
        title: 'nav.permissions',
        icon: 'mdi-key-variant',
        path: '/iam/permissions',
        permission: Permission.Permissions.Read,
      },
    ],
  },
];

export const ADMIN_GROUP_LABEL = 'nav.groupManagement';
export const IAM_GROUP_LABEL = 'nav.groupIam';

export function flattenRoutePermissions(): {
  prefix: string;
  permission: Permission;
  redirectTo?: string;
}[] {
  const result: { prefix: string; permission: Permission; redirectTo?: string }[] = [];

  for (const group of APP_ROUTES) {
    for (const item of group.items) {
      if (item.permission && item.path) {
        result.push({
          prefix: item.path,
          permission: item.permission,
          redirectTo: item.redirectTo,
        });
      }

      for (const child of item.children ?? []) {
        if (child.permission && child.path) {
          result.push({
            prefix: child.path,
            permission: child.permission,
            redirectTo: child.redirectTo,
          });
        }
      }
    }
  }

  return result;
}

export function flattenRouteFeatureFlags(): { prefix: string; featureFlag: FeatureFlag }[] {
  const result: { prefix: string; featureFlag: FeatureFlag }[] = [];

  for (const group of APP_ROUTES) {
    for (const item of group.items) {
      if (item.featureFlag && item.path) {
        result.push({ prefix: item.path, featureFlag: item.featureFlag });
      }

      for (const child of item.children ?? []) {
        if (child.featureFlag && child.path) {
          result.push({ prefix: child.path, featureFlag: child.featureFlag });
        }
      }
    }
  }

  return result;
}
