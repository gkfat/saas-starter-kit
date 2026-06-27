import { getPermissionsForRole } from '../modules/roles';

export default defineEventHandler(async (event) => {
  const { userId, tenantId, role } = event.context;

  if (!userId || !tenantId || !role) return;
  if (role === 'superadmin') return;

  const permissions = await getPermissionsForRole(tenantId, role);
  event.context.permissions = permissions;
});
