import { getAllRolePermissions } from '~/modules/roles';
import { requirePermission } from '~/shared/rbac';
import { Permission } from '@saas-starter-kit/shared';

export default defineEventHandler((event) => {
  requirePermission(event, Permission.Roles.Read);
  return getAllRolePermissions();
});
