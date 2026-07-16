import { getAllRoles } from '~/server/modules/roles';
import { requirePermission } from '~/server/shared/rbac';
import { Permission } from '~/shared/permissions';
import { Role } from '~/shared/roles';

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Roles.Read);
  const roles = await getAllRoles();
  return roles.filter((role) => role.name !== Role.SuperAdmin);
});
