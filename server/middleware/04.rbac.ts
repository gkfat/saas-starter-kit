import { Role } from '~/shared/roles';
import { getPermissionsForRole } from '../modules/roles';

export default defineEventHandler(async (event) => {
  const { userId, role } = event.context;

  if (!userId || !role) return;
  if (role === Role.SuperAdmin) return;

  const permissions = await getPermissionsForRole(role);
  event.context.permissions = permissions;
});
