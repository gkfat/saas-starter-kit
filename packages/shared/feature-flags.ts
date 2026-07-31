export const FeatureFlag = {
  AuditLog: 'auditLog',
  LoginLog: 'loginLog',
} as const;

export type FeatureFlag = (typeof FeatureFlag)[keyof typeof FeatureFlag];

export type FeatureFlags = Record<FeatureFlag, boolean>;
