import { getAllUsers } from '~/server/modules/users';
import { getRoleForUser } from '~/server/modules/roles';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';

export default defineEventHandler(async (event) => {
  requirePermission(event, 'users:read');
  const { tenantId } = event.context as AuthenticatedContext;
  const users = await getAllUsers(tenantId);
  return Promise.all(
    users.map(async (user) => ({
      ...user,
      role: await getRoleForUser(tenantId, user.uid),
    })),
  );
});
