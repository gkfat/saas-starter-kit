import { z } from 'zod';
import { getAccountStatus } from '~/modules/identity';
import { getAllUsers } from '~/modules/users';
import { getRoleForUser } from '~/modules/roles';
import { requirePermission } from '~/shared/rbac';
import { Permission, Role } from '@saas-starter-kit/shared';

const QuerySchema = z.object({
  q: z.string().optional(),
  role: z.enum(['member', 'non-member']),
});

export default defineEventHandler(async (event) => {
  const { q, role: scope } = QuerySchema.parse(getQuery(event));
  requirePermission(
    event,
    scope === 'member' ? Permission.Members.Read : Permission.AdminAccounts.Read,
  );
  const keyword = q?.trim().toLowerCase();

  const users = await getAllUsers();
  const withRole = await Promise.all(
    users.map(async (user) => {
      const { disabled } = await getAccountStatus(user.userId);
      return {
        ...user,
        disabled,
        role: await getRoleForUser(user.userId),
      };
    }),
  );
  return withRole
    .filter(
      (user) =>
        !keyword ||
        user.username.toLowerCase().includes(keyword) ||
        (user.email ?? '').toLowerCase().includes(keyword),
    )
    .filter((user) => (scope === 'member' ? user.role === Role.Member : user.role !== Role.Member));
});
