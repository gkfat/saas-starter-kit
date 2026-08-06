import { getAccountStatus } from '~/modules/identity';
import { getLevel } from '~/modules/level';
import { getRoleForUser } from '~/modules/roles';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import { FeatureFlag, Permission, Role } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  const userId = getRouterParam(event, 'id');
  if (!userId) throw createError({ statusCode: 400, message: 'Missing user id' });

  const user = await getUserById(userId);
  if (!user) throw createError({ statusCode: 404, message: 'User not found' });

  const role = await getRoleForUser(userId);
  requirePermission(
    event,
    role === Role.Member ? Permission.Members.Read : Permission.AdminAccounts.Read,
  );

  const [{ disabled }, level] = await Promise.all([
    getAccountStatus(userId),
    useRuntimeConfig().public.featureFlags[FeatureFlag.Level] ? getLevel(userId) : null,
  ]);

  return { ...user, disabled, role, level };
});
