import { adminAuth } from '~/shared/firebase-admin';
import { recordAuditLog } from '~/modules/logs';
import { deleteUserRole, getRoleForUser } from '~/modules/roles';
import { deleteUserAccount, getUserByUid } from '~/modules/users';
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

  let disabled: boolean;
  try {
    disabled = (await adminAuth().getUser(userId)).disabled;
  } catch {
    throw createError({ statusCode: 404, message: '使用者不存在' });
  }
  if (!disabled) {
    throw createError({ statusCode: 400, message: '僅能刪除已停用的使用者' });
  }

  await adminAuth().deleteUser(userId);
  await deleteUserAccount(userId);
  await deleteUserRole(userId);

  if (actorRole !== Role.SuperAdmin) {
    const actorUser = await getUserByUid(actorId);
    recordAuditLog({
      severity: 'INFO',
      timestamp: new Date().toISOString(),
      requestId,
      actor: {
        userId: actorId,
        role: actorRole ?? 'unknown',
        ...(actorUser?.username ? { username: actorUser.username } : {}),
      },
      action: 'user.delete',
      metadata: { userId },
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

  return { ok: true };
});
