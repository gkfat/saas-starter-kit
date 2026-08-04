import { z } from 'zod';
import { adminAuth } from '~/shared/firebase-admin';
import { verifyLineIdToken } from '~/modules/auth';
import {
  validateLineBindCode,
  markLineBindCodeUsed,
  bindProvider,
  revokeSessionsForUser,
} from '~/modules/identity';

const BodySchema = z.object({
  code: z.string().min(1),
  idToken: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const parsed = BodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request' });
  }

  let bindCode: Awaited<ReturnType<typeof validateLineBindCode>>;
  try {
    bindCode = await validateLineBindCode(parsed.data.code);
  } catch {
    throw createError({ statusCode: 400, message: '驗證碼無效或已過期' });
  }

  let lineIdentity: Awaited<ReturnType<typeof verifyLineIdToken>>;
  try {
    lineIdentity = await verifyLineIdToken(parsed.data.idToken);
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
        ...(lineIdentity.displayName ? { displayName: lineIdentity.displayName } : {}),
      })
    ).uid;
  } catch {
    throw createError({ statusCode: 500, message: '綁定失敗' });
  }

  try {
    await bindProvider({
      userId: bindCode.userId,
      providerType: 'line',
      providerUserId: lineIdentity.lineUserId,
      firebaseUid,
    });
  } catch (err: unknown) {
    await adminAuth()
      .deleteUser(firebaseUid)
      .catch(() => {});
    const code = (err as { code?: string }).code;
    if (code === 'provider-taken') {
      throw createError({ statusCode: 409, message: '此 LINE 帳號已被其他帳號綁定' });
    }
    throw createError({ statusCode: 500, message: '綁定失敗' });
  }

  await markLineBindCodeUsed(parsed.data.code);
  await revokeSessionsForUser(bindCode.userId);

  return { ok: true };
});
