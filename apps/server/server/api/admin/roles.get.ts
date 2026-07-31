import { getAllRoles } from '~/modules/roles';
import { requirePermission } from '~/shared/rbac';
import { Permission, Role } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Roles.Read);
  const roles = await getAllRoles();
  return roles.filter((role) => role.name !== Role.SuperAdmin);
});
