import { getAllUsers } from '~/server/modules/users';
import { getRoleForUser } from '~/server/modules/roles';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';
import { Permission } from '~/shared/permissions';

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Users.Read);
  const { tenantId } = event.context as AuthenticatedContext;
  const users = await getAllUsers(tenantId);
  return Promise.all(
    users.map(async (user) => ({
      ...user,
      role: await getRoleForUser(tenantId, user.uid),
    })),
  );
});
