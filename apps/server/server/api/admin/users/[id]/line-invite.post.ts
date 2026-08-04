import { recordAuditLog } from '~/modules/logs';
import { generateLineInviteToken } from '~/modules/identity';
import { getUserById } from '~/modules/users';
import { getRoleForUser } from '~/modules/roles';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { Permission, Role } from '@saas-starter-kit/shared';
import type { GenerateLineInviteResponse } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<GenerateLineInviteResponse> => {
  const { userId: actorId, role: actorRole, requestId } = event.context as AuthenticatedContext;
  const userId = getRouterParam(event, 'id');
  if (!userId) throw createError({ statusCode: 400, message: 'Missing user id' });

  const targetRole = await getRoleForUser(userId);
  requirePermission(
    event,
    targetRole === Role.Member ? Permission.Members.Write : Permission.AdminAccounts.Write,
  );

  const targetUser = await getUserById(userId);
  if (!targetUser) {
    throw createError({ statusCode: 404, message: '使用者不存在' });
  }
  if (!targetUser.passwordSetupPending) {
    throw createError({ statusCode: 400, message: '此使用者已啟用，無需產生邀請連結' });
  }

  const token = await generateLineInviteToken(userId);
  const config = useRuntimeConfig();
  const inviteLink = `${config.liffAppUrl}/invite?token=${token}`;

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
    action: 'user.line_invite.generate',
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

  return { inviteLink };
});
