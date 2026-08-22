import { createBookingProvider } from '~/modules/booking';
import { CreateBookingProviderSchema } from '~/modules/booking/booking.schema';
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

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = parseOrBadRequest(CreateBookingProviderSchema, await readBody(event));

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  return withAuditLog(
    {
      action: 'booking.provider.create',
      actor,
      requestId,
      metadata: (result) => ({ providerId: result.id, ...body }),
      metadataOnError: body,
    },
    () => createBookingProvider(body),
  );
});
