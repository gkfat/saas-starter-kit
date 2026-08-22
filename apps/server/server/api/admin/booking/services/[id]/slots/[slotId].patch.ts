import { z } from 'zod';
import { updateBookingTimeSlot } from '~/modules/booking';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { parseOrBadRequest } from '~/shared/validation';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { BookingTimeSlot } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  capacity: z.number().int().positive().optional(),
});

export default defineEventHandler(async (event): Promise<BookingTimeSlot> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Bookings.Write);

  const serviceId = getRouterParam(event, 'id');
  const slotId = getRouterParam(event, 'slotId');
  if (!serviceId || !slotId) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = parseOrBadRequest(BodySchema, await readBody(event));

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  return withAuditLog(
    {
      action: 'booking.timeSlot.update',
      actor,
      requestId,
      metadata: () => ({ serviceId, timeSlotId: slotId, ...body }),
      metadataOnError: { serviceId, timeSlotId: slotId, ...body },
    },
    async () => {
      try {
        return await updateBookingTimeSlot(serviceId, slotId, body);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === 'booking-time-slot-not-found') {
          throw createError({ statusCode: 404, message: (err as Error).message });
        }
        if (code === 'booking-time-slot-invalid-schedule') {
          throw createError({ statusCode: 400, message: (err as Error).message });
        }
        if (code === 'booking-time-slot-capacity-below-usage') {
          throw createError({ statusCode: 409, message: (err as Error).message });
        }
        throw err;
      }
    },
  );
});
