import { recordAuditLog } from '~/modules/logs';
import { generateSetupToken } from '~/modules/password-setup';
import { getUserById } from '~/modules/users';
import { findUserAuthRecord } from '~/modules/identity';
import { getRoleForUser } from '~/modules/roles';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { Permission, Role } from '@saas-starter-kit/shared';
import type { RegenerateSetupLinkResponse } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<RegenerateSetupLinkResponse> => {
  const { userId: actorId, role: actorRole, requestId } = event.context as AuthenticatedContext;
  const userId = getRouterParam(event, 'id');
  if (!userId) throw createError({ statusCode: 400, message: 'Missing user id' });

  const targetRole = await getRoleForUser(userId);
  requirePermission(
    event,
    targetRole === Role.Member ? Permission.Members.Write : Permission.AdminAccounts.Write,
  );

  const targetUser = await getUserById(userId);
  if (!targetUser || !targetUser.passwordSetupPending) {
    throw createError({ statusCode: 400, message: '此使用者已設定密碼，無需重新產生連結' });
  }

  const passwordAuth = await findUserAuthRecord('password', targetUser.username);
  if (!passwordAuth) {
    throw createError({ statusCode: 500, message: '找不到對應的登入資料' });
  }

  const setupToken = await generateSetupToken({ userId, firebaseUid: passwordAuth.firebaseUid });
  const { adminAppUrl } = useRuntimeConfig();
  const setupLink = `${adminAppUrl}/auth/set-password?token=${setupToken}`;

  if (actorRole !== Role.SuperAdmin) {
    const actorUser = await getUserById(actorId);
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
