import { z } from 'zod';
import { verifyRawIdToken } from '~/modules/auth';
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

  let googleIdentity: Awaited<ReturnType<typeof verifyRawIdToken>>;
  try {
    googleIdentity = await verifyRawIdToken(parsed.data.idToken);
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid ID token' });
  }

  try {
    await bindProvider({
      userId: ctx.userId,
      providerType: 'google',
      providerUserId: googleIdentity.firebaseUid,
      firebaseUid: googleIdentity.firebaseUid,
    });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'provider-taken') {
      throw createError({ statusCode: 409, message: '此 Google 帳號已被其他帳號綁定' });
    }
    throw err;
  }

  await revokeSessionsForUser(ctx.userId);

  return { ok: true };
});
