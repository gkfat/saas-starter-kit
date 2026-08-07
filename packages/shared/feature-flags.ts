export const FeatureFlag = {
  AuditLog: 'auditLog',
  LoginLog: 'loginLog',
  Level: 'level',
  Coupon: 'coupon',
} as const;

export type FeatureFlag = (typeof FeatureFlag)[keyof typeof FeatureFlag];

export type FeatureFlags = Record<FeatureFlag, boolean>;
