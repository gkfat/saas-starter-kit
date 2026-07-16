import { listLoginLogs } from '~/server/modules/logs';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';
import { FeatureFlag } from '~/shared/feature-flags';
import { Permission } from '~/shared/permissions';
import { Role } from '~/shared/roles';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.LoginLog]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.LoginLogs.Read);
  const { tenantId } = event.context as AuthenticatedContext;
  const logs = await listLoginLogs(tenantId);
  return logs.filter((log) => log.actor.role !== Role.SuperAdmin);
});
