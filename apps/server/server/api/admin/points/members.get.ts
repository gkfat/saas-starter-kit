import { z } from 'zod';
import { getMemberBalancesForUsers } from '~/modules/points';
import { getRoleForUser } from '~/modules/roles';
import { getAllUsers } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import { FeatureFlag, Permission, Role } from '@saas-starter-kit/shared';
import type { PointsMemberRow } from '@saas-starter-kit/shared';

const QuerySchema = z.object({
  q: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Points]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Points.Read);

  const { q } = QuerySchema.parse(getQuery(event));
  const keyword = q?.trim().toLowerCase();

  const allUsers = await getAllUsers();
  const roles = await Promise.all(allUsers.map((user) => getRoleForUser(user.userId)));
  const members = allUsers.filter((_, index) => roles[index] === Role.Member);
  const balances = await getMemberBalancesForUsers(members.map((user) => user.userId));

  const rows: PointsMemberRow[] = members
    .filter(
      (user) =>
        !keyword ||
        user.username.toLowerCase().includes(keyword) ||
        user.displayName.toLowerCase().includes(keyword) ||
        (user.email ?? '').toLowerCase().includes(keyword) ||
        user.memberNo.toLowerCase().includes(keyword),
    )
    .map((user) => ({
      userId: user.userId,
      memberNo: user.memberNo,
      displayName: user.displayName,
      email: user.email,
      balance: balances.get(user.userId) ?? 0,
    }));

  return rows;
});
