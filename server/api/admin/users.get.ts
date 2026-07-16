import { isSuperAdminUid } from '~/server/modules/auth';
import { getAllUsers } from '~/server/modules/users';
import { getRoleForUser } from '~/server/modules/roles';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';
import { Permission } from '~/shared/permissions';

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Users.Read);
  const { tenantId } = event.context as AuthenticatedContext;
  const users = await getAllUsers(tenantId);
  const withRole = await Promise.all(
    users.map(async (user) => ({
      ...user,
      isSuperAdmin: await isSuperAdminUid(user.uid),
      role: await getRoleForUser(tenantId, user.uid),
    })),
  );
  return withRole
    .filter((user) => !user.isSuperAdmin)
    .map(({ isSuperAdmin: _isSuperAdmin, ...user }) => user);
});
