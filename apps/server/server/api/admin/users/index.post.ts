import { randomBytes } from 'crypto';
import { adminAuth } from '~/shared/firebase-admin';
import { hashPassword } from '~/shared/crypto';
import { recordAuditLog } from '~/modules/logs';
import { createUserByAdmin, getUserByUid, CreateUserByAdminDto } from '~/modules/users';
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

  let uid: string;
  try {
    uid = (await adminAuth().createUser({ displayName })).uid;
  } catch {
    throw createError({ statusCode: 500, message: '建立帳號失敗' });
  }

  const passwordHash = await hashPassword(randomBytes(32).toString('hex'));

  try {
    await createUserByAdmin({
      uid,
      username,
      displayName,
      email: email ?? null,
      phone: phone ?? null,
      passwordHash,
      role,
    });
  } catch (err: unknown) {
    await adminAuth()
      .deleteUser(uid)
      .catch(() => {});
    const code = (err as { code?: string }).code;
    if (code === 'username-taken') {
      throw createError({ statusCode: 409, message: '此帳號名稱已被使用' });
    }
    throw createError({ statusCode: 500, message: '建立帳號失敗' });
  }

  const setupToken = await generateSetupToken(uid);
  const setupLink = `${getRequestURL(event).origin}/auth/set-password?token=${setupToken}`;

  const actorUser = await getUserByUid(actorId);
  recordAuditLog({
    severity: 'INFO',
    timestamp: new Date().toISOString(),
    requestId,
    actor: {
      userId: actorId,
      role: actorRole,
      ...(actorUser?.username ? { username: actorUser.username } : {}),
    },
    action: 'user.create',
    metadata: { uid, username, role },
  }).catch((err) =>
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'Failed to write audit_log',
        error: String(err),
      }),
    ),
  );

  return { uid, setupLink };
});
