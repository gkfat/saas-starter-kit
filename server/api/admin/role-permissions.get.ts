import { getAllRolePermissions } from '~/server/modules/roles';
import { requirePermission } from '~/server/shared/rbac';
import { Permission } from '~/shared/permissions';

export default defineEventHandler((event) => {
  requirePermission(event, Permission.Roles.Read);
  return getAllRolePermissions();
});
