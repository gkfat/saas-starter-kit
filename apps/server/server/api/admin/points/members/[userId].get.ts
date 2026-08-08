import { getMemberBalance, listLedgerForMember } from '~/modules/points';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { PointsMemberDetail } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<PointsMemberDetail> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Points]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Points.Read);

  const userId = getRouterParam(event, 'userId');
  if (!userId) throw createError({ statusCode: 400, message: 'Missing user id' });

  const user = await getUserById(userId);
  if (!user) throw createError({ statusCode: 404, message: 'User not found' });

  const [balance, ledger] = await Promise.all([
    getMemberBalance(userId),
    listLedgerForMember(userId),
  ]);

  return { userId, balance, ledger };
});
