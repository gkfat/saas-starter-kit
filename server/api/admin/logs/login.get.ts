import { listLoginLogs } from '~/server/modules/logs';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'admin:access');
  const { tenantId } = event.context as AuthenticatedContext;
  return listLoginLogs(tenantId);
});
