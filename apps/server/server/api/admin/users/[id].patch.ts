import { z } from 'zod';
import { recordAuditLog } from '~/modules/logs';
import { assignUserRole, getRoleForUser } from '~/modules/roles';
import { revokeRefreshTokens } from '~/modules/auth';
import { requirePermission } from '~/shared/rbac';
import { adminAuth } from '~/shared/firebase-admin';
import type { AuthenticatedContext } from '~/shared/types/context';
import { getUserByUid } from '~/modules/users';
import { Permission, Role } from '@saas-starter-kit/shared';
import type { OkResponse } from '@saas-starter-kit/shared';

const BodySchema = z
  .object({
    role: z.string().min(1).optional(),
    disabled: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.disabled !== undefined, {
    message: 'role 或 disabled 至少需提供一項',
  });

export default defineEventHandler(async (event): Promise<OkResponse> => {
  const { userId: actorId, role: actorRole, requestId } = event.context as AuthenticatedContext;
  const userId = getRouterParam(event, 'id');
  if (!userId) throw createError({ statusCode: 400, message: 'Missing user id' });

  const targetRole = await getRoleForUser(userId);
  requirePermission(
    event,
    targetRole === Role.Member ? Permission.Members.Write : Permission.AdminAccounts.Write,
  );

  const body = BodySchema.parse(await readBody(event));

  if (body.disabled === true && actorId === userId) {
    throw createError({ statusCode: 400, message: '無法停用自己的帳號' });
  }

  const actorUser = actorRole !== Role.SuperAdmin ? await getUserByUid(actorId) : null;
  const auditActor = {
    userId: actorId,
    role: actorRole ?? 'unknown',
    ...(actorUser?.username ? { username: actorUser.username } : {}),
  };

  if (body.role !== undefined) {
    await assignUserRole(userId, body.role);
    if (actorRole !== Role.SuperAdmin) {
      recordAuditLog({
        severity: 'INFO',
        timestamp: new Date().toISOString(),
        requestId,
        actor: auditActor,
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
    }
  }

  if (body.disabled !== undefined) {
    await adminAuth().updateUser(userId, { disabled: body.disabled });
    if (body.disabled) {
      await revokeRefreshTokens(userId);
    }
    if (actorRole !== Role.SuperAdmin) {
      recordAuditLog({
        severity: 'INFO',
        timestamp: new Date().toISOString(),
        requestId,
        actor: auditActor,
        action: 'user.status.update',
        metadata: { userId, disabled: body.disabled },
      }).catch((err) =>
        console.error(
          JSON.stringify({
            severity: 'ERROR',
            message: 'Failed to write audit_log',
            error: String(err),
          }),
        ),
      );
    }
  }

  return { ok: true };
});
