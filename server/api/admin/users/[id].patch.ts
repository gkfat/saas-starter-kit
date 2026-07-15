import { z } from 'zod';
import { recordAuditLog } from '~/server/modules/logs';
import { assignUserRole } from '~/server/modules/roles';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';
import { getUserByUid } from '~/server/modules/users';
import { Permission } from '~/shared/permissions';

const BodySchema = z.object({
  role: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Users.Write);
  const {
    tenantId,
    userId: actorId,
    role: actorRole,
    requestId,
  } = event.context as AuthenticatedContext;
  const userId = getRouterParam(event, 'id');
  if (!userId) throw createError({ statusCode: 400, message: 'Missing user id' });
  const body = BodySchema.parse(await readBody(event));
  await assignUserRole(tenantId, userId, body.role);
  const actorUser = await getUserByUid(tenantId, actorId);
  recordAuditLog(tenantId, {
    severity: 'INFO',
    timestamp: new Date().toISOString(),
    requestId,
    actor: {
      userId: actorId,
      tenantId,
      role: actorRole ?? 'unknown',
      ...(actorUser?.username ? { username: actorUser.username } : {}),
    },
    action: 'user.role.assign',
    metadata: { userId, role: body.role },
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
