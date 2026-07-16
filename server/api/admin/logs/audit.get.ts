import { listAuditLogs } from '~/server/modules/logs';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';
import { FeatureFlag } from '~/shared/feature-flags';
import { Permission } from '~/shared/permissions';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.AuditLog]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.AuditLogs.Read);
  const { tenantId } = event.context as AuthenticatedContext;
  return listAuditLogs(tenantId);
});
