import { z } from 'zod';
import { cancelBooking } from '~/modules/booking';
import type { AuthenticatedContext } from '~/shared/types/context';
import { parseOrBadRequest } from '~/shared/validation';
import { FeatureFlag } from '@saas-starter-kit/shared';
import type { Booking } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  status: z.literal('cancelled'),
});

export default defineEventHandler(async (event): Promise<Booking> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const { userId } = event.context as AuthenticatedContext;
  parseOrBadRequest(BodySchema, await readBody(event));

  try {
    return await cancelBooking(id, userId);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'booking-not-found' || code === 'booking-time-slot-not-found') {
      throw createError({ statusCode: 404, message: (err as Error).message });
    }
    if (code === 'booking-forbidden') {
      throw createError({ statusCode: 403, message: (err as Error).message });
    }
    if (
      code === 'booking-invalid-status-transition' ||
      code === 'booking-cancellation-window-closed'
    ) {
      throw createError({ statusCode: 409, message: (err as Error).message });
    }
    throw err;
  }
});
