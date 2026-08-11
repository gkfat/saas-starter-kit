import { z } from 'zod';
import { createEvent } from '~/modules/events';
import { recordAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { Event } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  title: z.string().min(1),
  copyText: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  enabled: z.boolean().optional(),
});

export default defineEventHandler(async (event): Promise<Event> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Event]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Events.Create);

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = BodySchema.parse(await readBody(event));

  let created: Event;
  try {
    created = await createEvent(body);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'event-invalid-schedule') {
      throw createError({ statusCode: 400, message: (err as Error).message });
    }
    throw err;
  }

  const actorUser = await getUserById(userId);
  recordAuditLog({
    severity: 'INFO',
    timestamp: new Date().toISOString(),
    requestId,
    actor: { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) },
    action: 'event.create',
    metadata: { eventId: created.id, ...body },
  }).catch((err) =>
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'Failed to write audit_log',
        error: String(err),
      }),
    ),
  );

  return created;
});
