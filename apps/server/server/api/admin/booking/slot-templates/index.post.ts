import { createBookingSlotTemplate } from '~/modules/booking';
import { CreateBookingSlotTemplateSchema } from '~/modules/booking/booking.schema';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { parseOrBadRequest } from '~/shared/validation';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { BookingSlotTemplate } from '@saas-starter-kit/shared';

// Reuses the module's own schema (rather than redefining a route-local copy) so the
// date/time regexes can't silently drift between the HTTP-facing 400 check here and the
// service-layer validation in booking.service.ts.
const BodySchema = CreateBookingSlotTemplateSchema;

export default defineEventHandler(async (event): Promise<BookingSlotTemplate> => {
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
      action: 'booking.slotTemplate.create',
      actor,
      requestId,
      metadata: (result) => ({
        templateId: result.id,
        name: body.name,
        weekdayCount: body.weekdays.length,
      }),
      metadataOnError: { name: body.name, weekdayCount: body.weekdays.length },
    },
    async () => {
      try {
        return await createBookingSlotTemplate(body);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === 'booking-slot-template-invalid-schedule') {
          throw createError({ statusCode: 400, message: (err as Error).message });
        }
        throw err;
      }
    },
  );
});
