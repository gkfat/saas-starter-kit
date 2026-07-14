import { listLoginLogs } from '~/server/modules/logs';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';
import { Permission } from '~/shared/permissions';

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.LoginLogs.Read);
  const { tenantId } = event.context as AuthenticatedContext;
  return listLoginLogs(tenantId);
});
