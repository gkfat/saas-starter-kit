import { z } from 'zod';
import { adminAuth } from '~/shared/firebase-admin';
import { verifyAuthenticatedIdToken } from '~/modules/auth';
import { bindProvider, findUserAuthRecord, revokeSessionsForUser } from '~/modules/identity';
import { getUserById, completePasswordSetup } from '~/modules/users';
import type { AuthenticatedContext } from '~/shared/types/context';
import { isValidPassword, toSyntheticEmail } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  newPassword: z.string().refine(isValidPassword, '密碼須為 6–8 碼英數字'),
  currentIdToken: z.string().min(1).optional(),
});

export default defineEventHandler(async (event) => {
  const ctx = event.context as AuthenticatedContext;
  const parsed = BodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid request',
    });
  }

  const user = await getUserById(ctx.userId);
  if (!user) {
    throw createError({ statusCode: 404, message: '使用者不存在' });
  }

  const existingPasswordAuth = await findUserAuthRecord('password', user.username);

  if (existingPasswordAuth) {
    if (!parsed.data.currentIdToken) {
      throw createError({ statusCode: 400, message: '請輸入目前密碼' });
    }

    let currentIdentity: Awaited<ReturnType<typeof verifyAuthenticatedIdToken>>;
    try {
      currentIdentity = await verifyAuthenticatedIdToken(parsed.data.currentIdToken);
    } catch {
      throw createError({ statusCode: 401, message: '目前密碼驗證失敗' });
    }

    if (
      currentIdentity.userId !== ctx.userId ||
      currentIdentity.firebaseUid !== existingPasswordAuth.firebaseUid
    ) {
      throw createError({ statusCode: 401, message: '目前密碼驗證失敗' });
    }

    await adminAuth().updateUser(existingPasswordAuth.firebaseUid, {
      password: parsed.data.newPassword,
    });
  } else {
    let firebaseUid: string;
    try {
      firebaseUid = (
        await adminAuth().createUser({
          email: toSyntheticEmail(user.username),
          emailVerified: true,
          password: parsed.data.newPassword,
        })
      ).uid;
    } catch {
      throw createError({ statusCode: 500, message: '設定密碼失敗' });
    }

    try {
      await bindProvider({
        userId: ctx.userId,
        providerType: 'password',
        providerUserId: user.username,
        firebaseUid,
      });
    } catch (err: unknown) {
      await adminAuth()
        .deleteUser(firebaseUid)
        .catch(() => {});
      throw err;
    }

    await completePasswordSetup(ctx.userId);
  }

  await revokeSessionsForUser(ctx.userId);

  return { ok: true };
});
