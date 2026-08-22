import { listVisibleBookingServices } from '~/modules/booking';
import { FeatureFlag } from '@saas-starter-kit/shared';

export default defineEventHandler(async () => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  return listVisibleBookingServices();
});
