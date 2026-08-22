import { z } from 'zod';
import { createBookingService } from '~/modules/booking';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { parseOrBadRequest } from '~/shared/validation';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { BookingService } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  approvalMode: z.enum(['auto', 'manual']),
  enabled: z.boolean().optional(),
});

export default defineEventHandler(async (event): Promise<BookingService> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Bookings.Write);

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = parseOrBadRequest(BodySchema, await readBody(event));

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  return withAuditLog(
    {
      action: 'booking.service.create',
      actor,
      requestId,
      metadata: (result) => ({ serviceId: result.id, ...body }),
      metadataOnError: body,
    },
    () => createBookingService(body),
  );
});
