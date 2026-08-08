import { adjustMemberPoints } from '~/modules/points';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { AdjustPointsRequest } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Points]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Points.Adjust);

  const userId = getRouterParam(event, 'userId');
  if (!userId) throw createError({ statusCode: 400, message: 'Missing user id' });

  const user = await getUserById(userId);
  if (!user) throw createError({ statusCode: 404, message: 'User not found' });

  const { userId: adminUserId } = event.context as AuthenticatedContext;
  const body = await readBody<AdjustPointsRequest>(event);

  try {
    return await adjustMemberPoints({ userId, ...body, createdBy: adminUserId });
  } catch (error) {
    if (
      error instanceof Error &&
      (error as { code?: string }).code === 'points-insufficient-balance'
    ) {
      throw createError({ statusCode: 400, message: error.message });
    }
    throw error;
  }
});
