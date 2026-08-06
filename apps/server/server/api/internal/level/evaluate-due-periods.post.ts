import { evaluateDuePeriods } from '~/modules/level';
import { requireLevelBatchSecret } from '~/shared/internal-auth';
import { FeatureFlag } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  requireLevelBatchSecret(event);

  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Level]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  return evaluateDuePeriods();
});
