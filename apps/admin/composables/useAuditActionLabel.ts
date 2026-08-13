export const AUDIT_LOG_ACTIONS = [
  'role.permissions.update',
  'coupon.template.create',
  'coupon.template.update',
  'coupon.instance.issue',
  'coupon.instance.redeem',
  'user.create',
  'user.delete',
  'user.role.assign',
  'user.status.update',
  'user.setup_link.regenerate',
  'user.line_invite.generate',
  'level.tier.create',
  'level.tier.update',
  'level.tier.delete',
  'event.create',
  'event.update',
  'event.delete',
  'event.banner.upload',
] as const;

export function useAuditActionLabel() {
  const { t, te } = useI18n();

  function actionLabel(action: string): string {
    const key = `logs.actions.${action}`;
    return te(key) ? t(key) : action;
  }

  return { actionLabel };
}
