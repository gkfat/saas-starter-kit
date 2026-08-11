import { deleteEvent } from '~/modules/events';
import { recordAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Event]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Events.Delete);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const { userId, role, requestId } = event.context as AuthenticatedContext;

  try {
    await deleteEvent(id);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'event-not-found') {
      throw createError({ statusCode: 404, message: (err as Error).message });
    }
    throw err;
  }

  const actorUser = await getUserById(userId);
  recordAuditLog({
    severity: 'INFO',
    timestamp: new Date().toISOString(),
    requestId,
    actor: { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) },
    action: 'event.delete',
    metadata: { eventId: id },
  }).catch((err) =>
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'Failed to write audit_log',
        error: String(err),
      }),
    ),
  );

  return { ok: true };
});
