import { listBookingTimeSlots } from '~/modules/booking';
import { requirePermission } from '~/shared/rbac';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Bookings.Read);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  try {
    return await listBookingTimeSlots(id);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'booking-service-not-found') {
      throw createError({ statusCode: 404, message: (err as Error).message });
    }
    throw err;
  }
});
