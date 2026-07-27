import { recordAuditLog } from '~/server/modules/logs';
import { generateSetupToken } from '~/server/modules/password-setup';
import { getUserByUid } from '~/server/modules/users';
import { getRoleForUser } from '~/server/modules/roles';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';
import { Permission } from '~/shared/permissions';
import { Role } from '~/shared/roles';

export default defineEventHandler(async (event) => {
  const { userId: actorId, role: actorRole, requestId } = event.context as AuthenticatedContext;
  const userId = getRouterParam(event, 'id');
  if (!userId) throw createError({ statusCode: 400, message: 'Missing user id' });

  const targetRole = await getRoleForUser(userId);
  requirePermission(
    event,
    targetRole === Role.Member ? Permission.Members.Write : Permission.AdminAccounts.Write,
  );

  const targetUser = await getUserByUid(userId);
  if (!targetUser || !targetUser.passwordSetupPending) {
    throw createError({ statusCode: 400, message: '此使用者已設定密碼，無需重新產生連結' });
  }

  const setupToken = await generateSetupToken(userId);
  const setupLink = `${getRequestURL(event).origin}/auth/set-password?token=${setupToken}`;

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
      action: 'user.setup_link.regenerate',
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

  return { setupLink };
});
