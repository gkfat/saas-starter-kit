import { z } from 'zod';
import { listAuditLogs } from '~/modules/logs';
import { requirePermission } from '~/shared/rbac';
import { FeatureFlag, Permission, Role } from '@saas-starter-kit/shared';

const QuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  actor: z.string().optional(),
  action: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.AuditLog]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.AuditLogs.Read);
  const query = QuerySchema.parse(getQuery(event));
  const logs = await listAuditLogs(query);
  return logs.filter((log) => log.actor.role !== Role.SuperAdmin);
});
