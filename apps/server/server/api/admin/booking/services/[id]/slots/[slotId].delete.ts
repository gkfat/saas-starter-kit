import { deleteBookingTimeSlot } from '~/modules/booking';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { OkResponse } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<OkResponse> => {
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

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  await withAuditLog(
    {
      action: 'booking.timeSlot.delete',
      actor,
      requestId,
      metadata: () => ({ serviceId, timeSlotId: slotId }),
      metadataOnError: { serviceId, timeSlotId: slotId },
    },
    async () => {
      try {
        await deleteBookingTimeSlot(serviceId, slotId);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === 'booking-time-slot-not-found') {
          throw createError({ statusCode: 404, message: (err as Error).message });
        }
        if (code === 'booking-time-slot-in-use') {
          throw createError({ statusCode: 409, message: (err as Error).message });
        }
        throw err;
      }
    },
  );

  return { ok: true };
});
