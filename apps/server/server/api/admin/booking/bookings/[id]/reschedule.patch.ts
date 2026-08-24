import { z } from 'zod';
import { adminRescheduleBooking } from '~/modules/booking';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { parseOrBadRequest } from '~/shared/validation';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { Booking } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  timeSlotId: z.string().min(1),
  /** Optional staff-facing note explaining the change; recorded in the audit log and shown on the booking. */
  note: z.string().trim().min(1).max(200).optional(),
});

export default defineEventHandler(async (event): Promise<Booking> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Bookings.Review);

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
      action: 'booking.booking.reschedule',
      actor,
      requestId,
      metadata: () => ({ bookingId: id, ...body }),
      metadataOnError: { bookingId: id, ...body },
    },
    async () => {
      try {
        return await adminRescheduleBooking(id, body.timeSlotId, { note: body.note });
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === 'booking-not-found' || code === 'booking-time-slot-not-found') {
          throw createError({ statusCode: 404, message: (err as Error).message });
        }
        if (
          code === 'booking-invalid-status-transition' ||
          code === 'booking-time-slot-service-mismatch' ||
          code === 'booking-time-slot-unchanged'
        ) {
          throw createError({ statusCode: 409, message: (err as Error).message });
        }
        if (code === 'booking-time-slot-full') {
          throw createError({ statusCode: 409, message: (err as Error).message });
        }
        throw err;
      }
    },
  );
});
