import { adminAuth } from '~/server/shared/firebase-admin';
import { recordAuditLog } from '~/server/modules/logs';
import { deleteUserRole, getRoleForUser } from '~/server/modules/roles';
import { deleteUserAccount, getUserByUid } from '~/server/modules/users';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';
import { Permission } from '~/shared/permissions';
import { Role } from '~/shared/roles';
import type { OkResponse } from '~/shared/dto/common';

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
