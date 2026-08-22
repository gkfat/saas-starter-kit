import { listVisibleBookingTimeSlots } from '~/modules/booking';
import { FeatureFlag } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  try {
    return await listVisibleBookingTimeSlots(id);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'booking-service-not-found') {
      throw createError({ statusCode: 404, message: (err as Error).message });
    }
    throw err;
  }
});
