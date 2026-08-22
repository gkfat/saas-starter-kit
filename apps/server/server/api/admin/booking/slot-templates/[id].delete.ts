import { deleteBookingSlotTemplate } from '~/modules/booking';
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

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const { userId, role, requestId } = event.context as AuthenticatedContext;

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  await withAuditLog(
    {
      action: 'booking.slotTemplate.delete',
      actor,
      requestId,
      metadata: () => ({ templateId: id }),
      metadataOnError: { templateId: id },
    },
    async () => {
      try {
        await deleteBookingSlotTemplate(id);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === 'booking-slot-template-not-found') {
          throw createError({ statusCode: 404, message: (err as Error).message });
        }
        throw err;
      }
    },
  );

  return { ok: true };
});
