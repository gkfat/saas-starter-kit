import { updateBookingProvider } from '~/modules/booking';
import { UpdateBookingProviderSchema } from '~/modules/booking/booking.schema';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { parseOrBadRequest } from '~/shared/validation';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { BookingProvider } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<BookingProvider> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Bookings.Write);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = parseOrBadRequest(UpdateBookingProviderSchema, await readBody(event));

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  return withAuditLog(
    {
      action: 'booking.provider.update',
      actor,
      requestId,
      metadata: () => ({ providerId: id, ...body }),
      metadataOnError: { providerId: id },
    },
    async () => {
      try {
        return await updateBookingProvider(id, body);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === 'booking-provider-not-found') {
          throw createError({ statusCode: 404, message: (err as Error).message });
        }
        throw err;
      }
    },
  );
});
