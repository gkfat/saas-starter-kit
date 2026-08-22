import { bulkCreateBookingTimeSlots } from '~/modules/booking';
import { BulkCreateBookingTimeSlotsSchema } from '~/modules/booking/booking.schema';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { parseOrBadRequest } from '~/shared/validation';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { BulkCreateBookingTimeSlotsResult } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<BulkCreateBookingTimeSlotsResult> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Bookings.Write);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = parseOrBadRequest(BulkCreateBookingTimeSlotsSchema, await readBody(event));

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  return withAuditLog(
    {
      action: 'booking.timeSlot.bulkCreate',
      actor,
      requestId,
      metadata: (result) => ({
        serviceId: id,
        requested: body.slots.length,
        created: result.created.length,
        skipped: result.skippedCount,
      }),
      metadataOnError: { serviceId: id, requested: body.slots.length },
    },
    async () => {
      try {
        return await bulkCreateBookingTimeSlots(id, body);
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
