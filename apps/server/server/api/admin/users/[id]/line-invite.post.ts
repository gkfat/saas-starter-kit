import { withAuditLog } from '~/modules/logs';
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
  if (targetRole !== Role.Member) {
    throw createError({ statusCode: 400, message: '管理員帳號不支援 LINE 邀請綁定' });
  }

  const targetUser = await getUserById(userId);
  if (!targetUser) {
    throw createError({ statusCode: 404, message: '使用者不存在' });
  }
  if (!targetUser.passwordSetupPending) {
    throw createError({ statusCode: 400, message: '此使用者已啟用，無需產生邀請連結' });
  }

  const actorUser = await getUserById(actorId);
  const actor = {
    userId: actorId,
    role: actorRole ?? 'unknown',
    ...(actorUser?.username ? { username: actorUser.username } : {}),
  };

  const token = await withAuditLog(
    {
      action: 'user.line_invite.generate',
      actor,
      requestId,
      metadata: () => ({ userId }),
      metadataOnError: { userId },
    },
    () => generateLineInviteToken(userId),
  );
  const config = useRuntimeConfig();
  const inviteLink = `${config.liffAppUrl}/auth/invite?token=${token}`;

  return { inviteLink };
});
