import { randomBytes } from 'crypto';
import { adminAuth } from '~/server/shared/firebase-admin';
import { hashPassword } from '~/server/shared/crypto';
import { recordAuditLog } from '~/server/modules/logs';
import { createUserByAdmin, getUserByUid, CreateUserByAdminDto } from '~/server/modules/users';
import { generateSetupToken } from '~/server/modules/password-setup';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';
import { Permission } from '~/shared/permissions';
import { Role } from '~/shared/roles';

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Users.Create);
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
