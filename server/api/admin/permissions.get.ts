import { getAllPermissions } from '~/server/modules/roles';
import { requirePermission } from '~/server/shared/rbac';
import { Permission } from '~/shared/permissions';

export default defineEventHandler((event) => {
  requirePermission(event, Permission.Permissions.Read);
  return getAllPermissions();
});
