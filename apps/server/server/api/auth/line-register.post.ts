import { z } from 'zod';
import { adminAuth } from '~/shared/firebase-admin';
import { verifyLineIdToken, createCustomToken } from '~/modules/auth';
import { registerUserWithProvider } from '~/modules/users';
import { isValidUsername } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  username: z.string().refine(isValidUsername, '帳號須為 6–20 碼，全英文或英文加數字'),
  idToken: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const parsed = BodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid request',
    });
  }

  const { username, idToken } = parsed.data;

  let identity: Awaited<ReturnType<typeof verifyLineIdToken>>;
  try {
    identity = await verifyLineIdToken(idToken);
  } catch (err: unknown) {
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'LINE ID token verification failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    throw createError({ statusCode: 401, message: 'Invalid LINE ID token' });
  }

  let firebaseUid: string;
  try {
    firebaseUid = (
      await adminAuth().createUser({
        ...(identity.displayName ? { displayName: identity.displayName } : {}),
      })
    ).uid;
  } catch {
    throw createError({ statusCode: 500, message: '建立帳號失敗' });
  }

  try {
    await registerUserWithProvider({
      username,
      displayName: identity.displayName ?? username,
      email: identity.email,
      phone: null,
      providerType: 'line',
      providerUserId: identity.lineUserId,
      firebaseUid,
    });
  } catch (err: unknown) {
    await adminAuth()
      .deleteUser(firebaseUid)
      .catch(() => {});
    const code = (err as { code?: string }).code;
    if (code === 'username-taken') {
      throw createError({ statusCode: 409, message: '此帳號名稱已被使用' });
    }
    throw createError({ statusCode: 500, message: '建立帳號失敗' });
  }

  const customToken = await createCustomToken(firebaseUid);
  return { customToken };
});
