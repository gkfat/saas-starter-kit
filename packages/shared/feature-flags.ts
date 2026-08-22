export const FeatureFlag = {
  AuditLog: 'auditLog',
  LoginLog: 'loginLog',
  Level: 'level',
  Coupon: 'coupon',
  Points: 'points',
  Event: 'event',
  Booking: 'booking',
} as const;

export type FeatureFlag = (typeof FeatureFlag)[keyof typeof FeatureFlag];

export type FeatureFlags = Record<FeatureFlag, boolean>;
