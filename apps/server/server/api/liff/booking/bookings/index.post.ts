import { z } from 'zod';
import { createBooking } from '~/modules/booking';
import type { AuthenticatedContext } from '~/shared/types/context';
import { parseOrBadRequest } from '~/shared/validation';
import { FeatureFlag } from '@saas-starter-kit/shared';
import type { Booking } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  serviceId: z.string().min(1),
  timeSlotId: z.string().min(1),
  providerId: z.string().min(1).optional(),
  note: z.string().trim().min(1).max(200).optional(),
});

export default defineEventHandler(async (event): Promise<Booking> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  const { userId } = event.context as AuthenticatedContext;
  const body = parseOrBadRequest(BodySchema, await readBody(event));

  try {
    return await createBooking(userId, body);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'booking-service-not-found' || code === 'booking-provider-not-found') {
      throw createError({ statusCode: 404, message: (err as Error).message });
    }
    if (code === 'booking-time-slot-not-found') {
      throw createError({ statusCode: 404, message: (err as Error).message });
    }
    if (code === 'booking-time-slot-full') {
      throw createError({ statusCode: 409, message: (err as Error).message });
    }
    if (code === 'booking-provider-not-available') {
      throw createError({ statusCode: 409, message: (err as Error).message });
    }
    throw err;
  }
});
