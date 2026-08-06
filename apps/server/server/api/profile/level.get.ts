import { getLevel } from '~/modules/level';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Level]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  const { userId } = event.context as AuthenticatedContext;
  return getLevel(userId);
});
