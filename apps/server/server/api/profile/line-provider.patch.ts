import { z } from 'zod';
import { adminAuth } from '~/shared/firebase-admin';
import { verifyLineIdToken } from '~/modules/auth';
import { bindProvider, revokeSessionsForUser } from '~/modules/identity';
import type { AuthenticatedContext } from '~/shared/types/context';

const BodySchema = z.object({
  idToken: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const ctx = event.context as AuthenticatedContext;
  const parsed = BodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request' });
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
      userId: ctx.userId,
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
    throw err;
  }

  await revokeSessionsForUser(ctx.userId);

  return { ok: true };
});
