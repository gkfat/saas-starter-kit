import { withAuditLog } from '~/modules/logs';
import { deleteUserRole, getRoleForUser } from '~/modules/roles';
import { deleteUserAccount, getUserById } from '~/modules/users';
import { getAccountStatus } from '~/modules/identity';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { Permission, Role } from '@saas-starter-kit/shared';
import type { OkResponse } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<OkResponse> => {
  const { userId: actorId, role: actorRole, requestId } = event.context as AuthenticatedContext;
  const userId = getRouterParam(event, 'id');
  if (!userId) throw createError({ statusCode: 400, message: 'Missing user id' });

  const targetRole = await getRoleForUser(userId);
  requirePermission(
    event,
    targetRole === Role.Member ? Permission.Members.Delete : Permission.AdminAccounts.Delete,
  );

  if (userId === actorId) {
    throw createError({ statusCode: 400, message: '無法刪除自己的帳號' });
  }

  const target = await getUserById(userId);
  if (!target) {
    throw createError({ statusCode: 404, message: '使用者不存在' });
  }

  const { disabled } = await getAccountStatus(userId);
  if (!disabled) {
    throw createError({ statusCode: 400, message: '僅能刪除已停用的使用者' });
  }

  const actorUser = await getUserById(actorId);
  const actor = {
    userId: actorId,
    role: actorRole ?? 'unknown',
    ...(actorUser?.username ? { username: actorUser.username } : {}),
  };

  await withAuditLog(
    {
      action: 'user.delete',
      actor,
      requestId,
      metadata: () => ({ userId }),
      metadataOnError: { userId },
    },
    async () => {
      await deleteUserAccount(userId);
      await deleteUserRole(userId);
    },
  );

  return { ok: true };
});
