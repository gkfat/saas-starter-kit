import { processOverdueBookings } from '~/modules/booking';
import { requireBookingBatchSecret } from '~/shared/internal-auth';
import { FeatureFlag } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  requireBookingBatchSecret(event);

  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  return processOverdueBookings();
});
