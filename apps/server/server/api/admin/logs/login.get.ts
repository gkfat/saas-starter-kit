import { listLoginLogs } from '~/modules/logs';
import { requirePermission } from '~/shared/rbac';
import { FeatureFlag, Permission, Role, isSyntheticEmail } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.LoginLog]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.LoginLogs.Read);
  const logs = await listLoginLogs();
  return logs
    .filter((log) => log.actor.role !== Role.SuperAdmin)
    .map((log) => (log.email && isSyntheticEmail(log.email) ? { ...log, email: undefined } : log));
});
