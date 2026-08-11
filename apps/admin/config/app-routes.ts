import { FeatureFlag, Permission } from '@saas-starter-kit/shared';

export const ROUTES = {
  root: '/',
  home: '/home',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  profile: '/profile',
  features: '/features',
  pricing: '/pricing',
  setPassword: '/auth/set-password',
  lineCallback: '/auth/line-callback',
  members: '/admin/members',
  adminAccounts: '/admin/admin-accounts',
  loginLogs: '/admin/logs/login',
  auditLogs: '/admin/logs/audit',
  levelTiers: '/admin/level/tiers',
  coupons: '/admin/coupons',
  couponsRedeem: '/admin/coupons/redeem',
  events: '/admin/events',
  pointsSettings: '/admin/points/settings',
  pointsMembers: '/admin/points/members',
  iamRoles: '/iam/roles',
  iamPermissions: '/iam/permissions',
} as const;

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
      { title: 'nav.home', icon: 'mdi-home-outline', path: ROUTES.home, public: true },
      {
        title: 'nav.dashboard',
        icon: 'mdi-view-dashboard',
        path: ROUTES.dashboard,
        exact: true,
        permission: Permission.Dashboard.Read,
        redirectTo: ROUTES.profile,
      },
      {
        title: 'nav.profile',
        icon: 'mdi-account-circle',
        path: ROUTES.profile,
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
        path: ROUTES.members,
        permission: Permission.Members.Read,
      },
      {
        title: 'nav.adminAccounts',
        icon: 'mdi-account-tie',
        path: ROUTES.adminAccounts,
        permission: Permission.AdminAccounts.Read,
      },
      {
        title: 'nav.loginLogs',
        icon: 'mdi-login',
        path: ROUTES.loginLogs,
        exact: true,
        permission: Permission.LoginLogs.Read,
        featureFlag: FeatureFlag.LoginLog,
      },
      {
        title: 'nav.auditLogs',
        icon: 'mdi-history',
        path: ROUTES.auditLogs,
        exact: true,
        permission: Permission.AuditLogs.Read,
        featureFlag: FeatureFlag.AuditLog,
      },
    ],
  },
  {
    label: 'nav.groupLevel',
    items: [
      {
        title: 'nav.levelTiers',
        icon: 'mdi-podium-gold',
        path: ROUTES.levelTiers,
        exact: true,
        permission: Permission.LevelTiers.Read,
        featureFlag: FeatureFlag.Level,
      },
    ],
  },
  {
    label: 'nav.groupCoupons',
    items: [
      {
        title: 'nav.coupons',
        icon: 'mdi-ticket-percent',
        path: ROUTES.coupons,
        exact: true,
        permission: Permission.Coupons.Read,
        featureFlag: FeatureFlag.Coupon,
      },
      {
        title: 'nav.couponsRedeem',
        icon: 'mdi-qrcode-scan',
        path: ROUTES.couponsRedeem,
        exact: true,
        permission: Permission.Coupons.Redeem,
        featureFlag: FeatureFlag.Coupon,
      },
    ],
  },
  {
    label: 'nav.groupEvents',
    items: [
      {
        title: 'nav.events',
        icon: 'mdi-bullhorn-outline',
        path: ROUTES.events,
        exact: true,
        permission: Permission.Events.Read,
        featureFlag: FeatureFlag.Event,
      },
    ],
  },
  {
    label: 'nav.groupPoints',
    items: [
      {
        title: 'nav.pointsSettings',
        icon: 'mdi-cash-multiple',
        path: ROUTES.pointsSettings,
        exact: true,
        permission: Permission.Points.Read,
        featureFlag: FeatureFlag.Points,
      },
      {
        title: 'nav.pointsMembers',
        icon: 'mdi-account-cash',
        path: ROUTES.pointsMembers,
        exact: true,
        permission: Permission.Points.Read,
        featureFlag: FeatureFlag.Points,
      },
    ],
  },
  {
    label: 'nav.groupIam',
    items: [
      {
        title: 'nav.adminRoles',
        icon: 'mdi-shield-account',
        path: ROUTES.iamRoles,
        permission: Permission.Roles.Read,
      },
      {
        title: 'nav.permissions',
        icon: 'mdi-key-variant',
        path: ROUTES.iamPermissions,
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
