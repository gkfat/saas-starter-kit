import { z } from 'zod';
import { getAuthAccountStatus } from '~/server/modules/auth';
import { getAllUsers } from '~/server/modules/users';
import { getRoleForUser } from '~/server/modules/roles';
import { requirePermission } from '~/server/shared/rbac';
import { Permission } from '~/shared/permissions';

const QuerySchema = z.object({
  q: z.string().optional(),
  role: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Users.Read);
  const { q, role: roleFilter } = QuerySchema.parse(getQuery(event));
  const keyword = q?.trim().toLowerCase();

  const users = await getAllUsers();
  const withRole = await Promise.all(
    users.map(async (user) => {
      const { isSuperAdmin, disabled } = await getAuthAccountStatus(user.uid);
      return {
        ...user,
        isSuperAdmin,
        disabled,
        role: await getRoleForUser(user.uid),
      };
    }),
  );
  return withRole
    .filter((user) => !user.isSuperAdmin)
    .filter(
      (user) =>
        !keyword ||
        user.username.toLowerCase().includes(keyword) ||
        (user.email ?? '').toLowerCase().includes(keyword),
    )
    .filter((user) => !roleFilter || user.role === roleFilter)
    .map(({ isSuperAdmin: _isSuperAdmin, ...user }) => user);
});
