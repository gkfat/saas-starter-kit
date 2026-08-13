import { z } from 'zod';
import { updateEvent } from '~/modules/events';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { Event } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  title: z.string().min(1).optional(),
  copyText: z.string().min(1).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  enabled: z.boolean().optional(),
});

export default defineEventHandler(async (event): Promise<Event> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Event]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Events.Write);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = BodySchema.parse(await readBody(event));

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  const updated = await withAuditLog(
    {
      action: 'event.update',
      actor,
      requestId,
      metadata: () => ({ eventId: id, ...body }),
      metadataOnError: { eventId: id, ...body },
    },
    async () => {
      try {
        return await updateEvent(id, body);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === 'event-not-found') {
          throw createError({ statusCode: 404, message: (err as Error).message });
        }
        if (code === 'event-invalid-schedule') {
          throw createError({ statusCode: 400, message: (err as Error).message });
        }
        throw err;
      }
    },
  );

  return updated;
});
