import { getAllRoles } from '~/server/modules/roles';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';
import { Permission } from '~/shared/permissions';

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Roles.Read);
  const { tenantId } = event.context as AuthenticatedContext;
  return getAllRoles(tenantId);
});
