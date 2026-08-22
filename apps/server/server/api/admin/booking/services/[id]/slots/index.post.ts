import { z } from 'zod';
import { createBookingTimeSlot } from '~/modules/booking';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { parseOrBadRequest } from '~/shared/validation';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { BookingTimeSlot } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  capacity: z.number().int().positive(),
});

export default defineEventHandler(async (event): Promise<BookingTimeSlot> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Bookings.Write);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = parseOrBadRequest(BodySchema, await readBody(event));

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  return withAuditLog(
    {
      action: 'booking.timeSlot.create',
      actor,
      requestId,
      metadata: (result) => ({ serviceId: id, timeSlotId: result.id, ...body }),
      metadataOnError: { serviceId: id, ...body },
    },
    async () => {
      try {
        return await createBookingTimeSlot(id, body);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === 'booking-service-not-found') {
          throw createError({ statusCode: 404, message: (err as Error).message });
        }
        if (code === 'booking-time-slot-invalid-schedule') {
          throw createError({ statusCode: 400, message: (err as Error).message });
        }
        throw err;
      }
    },
  );
});
