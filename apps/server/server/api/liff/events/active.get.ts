import { listVisibleEvents } from '~/modules/events';
import { FeatureFlag } from '@saas-starter-kit/shared';

export default defineEventHandler(async () => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Event]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  return listVisibleEvents();
});
