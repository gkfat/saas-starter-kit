import { listBookableBookingProviders } from '~/modules/booking';
import { FeatureFlag } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  const timeSlotId = getQuery(event).timeSlotId;
  return listBookableBookingProviders({
    timeSlotId: typeof timeSlotId === 'string' ? timeSlotId : undefined,
  });
});
