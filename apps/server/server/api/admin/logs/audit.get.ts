import { listAuditLogs } from '~/modules/logs';
import { requirePermission } from '~/shared/rbac';
import { FeatureFlag, Permission, Role } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.AuditLog]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.AuditLogs.Read);
  const logs = await listAuditLogs();
  return logs.filter((log) => log.actor.role !== Role.SuperAdmin);
});
