import { adminAuth } from '~/shared/firebase-admin';
import { withAuditLog } from '~/modules/logs';
import { registerUserWithProvider, getUserById, CreateUserByAdminDto } from '~/modules/users';
import { generateSetupToken } from '~/modules/password-setup';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { Permission, Role } from '@saas-starter-kit/shared';
import type { CreateUserResponse } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<CreateUserResponse> => {
  const { userId: actorId, role: actorRole, requestId } = event.context as AuthenticatedContext;

  const parsed = CreateUserByAdminDto.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid request',
    });
  }
  const { username, email, phone } = parsed.data;
  const displayName = parsed.data.displayName || username;
  const role = parsed.data.role || Role.Member;

  requirePermission(
    event,
    role === Role.Member ? Permission.Members.Create : Permission.AdminAccounts.Create,
  );

  const actorUser = await getUserById(actorId);
  const actor = {
    userId: actorId,
    role: actorRole,
    ...(actorUser?.username ? { username: actorUser.username } : {}),
  };

  const { user, firebaseUid } = await withAuditLog(
    {
      action: 'user.create',
      actor,
      requestId,
      metadata: ({ user: result }) => ({ userId: result.userId, username, role }),
      metadataOnError: { username, role },
    },
    async () => {
      let firebaseUid: string;
      try {
        firebaseUid = (await adminAuth().createUser({ displayName })).uid;
      } catch {
        throw createError({ statusCode: 500, message: '建立帳號失敗' });
      }

      try {
        const user = await registerUserWithProvider({
          username,
          displayName,
          email: email ?? null,
          phone: phone ?? null,
          providerType: 'password',
          providerUserId: username,
          firebaseUid,
          role,
          passwordSetupPending: true,
        });
        return { user, firebaseUid };
      } catch (err: unknown) {
        await adminAuth()
          .deleteUser(firebaseUid)
          .catch(() => {});
        const code = (err as { code?: string }).code;
        if (code === 'username-taken') {
          throw createError({
            statusCode: 409,
            message: '此帳號名稱已被使用',
            data: { code: 'username-taken' },
          });
        }
        if (code === 'contact-taken') {
          throw createError({
            statusCode: 409,
            message: '建立失敗，請確認輸入資料後再試',
            data: { code: 'contact-taken' },
          });
        }
        throw createError({ statusCode: 500, message: '建立帳號失敗' });
      }
    },
  );

  const setupToken = await generateSetupToken({ userId: user.userId, firebaseUid });
  const { adminAppUrl } = useRuntimeConfig();
  const setupLink = `${adminAppUrl}/auth/set-password?token=${setupToken}`;

  return { userId: user.userId, setupLink };
});
