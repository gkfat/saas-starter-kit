import { z } from 'zod';
import { withAuditLog } from '~/modules/logs';
import { assignUserRole, getRoleForUser } from '~/modules/roles';
import { setAccountDisabled, revokeSessionsForUser } from '~/modules/identity';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { getUserById } from '~/modules/users';
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

  const actorUser = await getUserById(actorId);
  const auditActor = {
    userId: actorId,
    role: actorRole ?? 'unknown',
    ...(actorUser?.username ? { username: actorUser.username } : {}),
  };

  if (body.role !== undefined) {
    const newRole = body.role;
    await withAuditLog(
      {
        action: 'user.role.assign',
        actor: auditActor,
        requestId,
        metadata: () => ({ userId, role: newRole }),
        metadataOnError: { userId, role: newRole },
      },
      () => assignUserRole(userId, newRole),
    );
  }

  if (body.disabled !== undefined) {
    const disabled = body.disabled;
    await withAuditLog(
      {
        action: 'user.status.update',
        actor: auditActor,
        requestId,
        metadata: () => ({ userId, disabled }),
        metadataOnError: { userId, disabled },
      },
      async () => {
        await setAccountDisabled(userId, disabled);
        if (disabled) {
          await revokeSessionsForUser(userId);
        }
      },
    );
  }

  return { ok: true };
});
