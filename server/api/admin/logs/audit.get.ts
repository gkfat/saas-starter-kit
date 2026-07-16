import { listAuditLogs } from '~/server/modules/logs';
import { requirePermission } from '~/server/shared/rbac';
import { FeatureFlag } from '~/shared/feature-flags';
import { Permission } from '~/shared/permissions';
import { Role } from '~/shared/roles';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.AuditLog]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.AuditLogs.Read);
  const logs = await listAuditLogs();
  return logs.filter((log) => log.actor.role !== Role.SuperAdmin);
});
