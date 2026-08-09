export const FeatureModule = {
  Auth: 'auth',
  Rbac: 'rbac',
  LoginLogs: 'loginLogs',
  AuditLogs: 'auditLogs',
  Dashboard: 'dashboard',
  UserManagement: 'userManagement',
  Level: 'level',
  Coupon: 'coupon',
  Points: 'points',
} as const;

export type FeatureModule = (typeof FeatureModule)[keyof typeof FeatureModule];

export const FEATURE_MODULES: FeatureModule[] = [
  FeatureModule.Auth,
  FeatureModule.Rbac,
  FeatureModule.LoginLogs,
  FeatureModule.AuditLogs,
  FeatureModule.Dashboard,
  FeatureModule.UserManagement,
  FeatureModule.Level,
  FeatureModule.Coupon,
  FeatureModule.Points,
];

// Every membership site needs sign-up/login and member data management, so these
// two modules are always included in a feature request and cannot be unselected.
export const MANDATORY_FEATURE_MODULES: FeatureModule[] = [
  FeatureModule.Auth,
  FeatureModule.UserManagement,
];
