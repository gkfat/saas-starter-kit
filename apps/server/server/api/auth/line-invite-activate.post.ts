import { z } from 'zod';
import { adminAuth } from '~/shared/firebase-admin';
import { verifyLineIdToken, createCustomToken } from '~/modules/auth';
import {
  resolveUserIdByProvider,
  findUserAuthRecord,
  bindProvider,
  validateLineInvite,
  markLineInviteUsed,
} from '~/modules/identity';

const BodySchema = z.object({
  token: z.string().min(1),
  idToken: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const parsed = BodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request' });
  }

  let invite: Awaited<ReturnType<typeof validateLineInvite>>;
  try {
    invite = await validateLineInvite(parsed.data.token);
  } catch {
    throw createError({ statusCode: 400, message: '邀請連結無效或已過期' });
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

  const existingUserId = await resolveUserIdByProvider('line', lineIdentity.lineUserId);

  // Already registered elsewhere via LINE — do not touch the invite's target account.
  // Sign the user into their existing account instead (see spec: reverse-duplicate detection).
  if (existingUserId && existingUserId !== invite.userId) {
    const record = await findUserAuthRecord('line', lineIdentity.lineUserId);
    const customToken = await createCustomToken(record!.firebaseUid);
    return { status: 'duplicate' as const, customToken };
  }

  // Invite already activated for this exact account (idempotent retry).
  if (existingUserId === invite.userId) {
    const record = await findUserAuthRecord('line', lineIdentity.lineUserId);
    await markLineInviteUsed(parsed.data.token);
    const customToken = await createCustomToken(record!.firebaseUid);
    return { status: 'activated' as const, customToken };
  }

  let firebaseUid: string;
  try {
    firebaseUid = (
      await adminAuth().createUser({
        ...(lineIdentity.displayName ? { displayName: lineIdentity.displayName } : {}),
      })
    ).uid;
  } catch {
    throw createError({ statusCode: 500, message: '啟用失敗' });
  }

  try {
    await bindProvider({
      userId: invite.userId,
      providerType: 'line',
      providerUserId: lineIdentity.lineUserId,
      firebaseUid,
    });
  } catch {
    await adminAuth()
      .deleteUser(firebaseUid)
      .catch(() => {});
    throw createError({ statusCode: 500, message: '啟用失敗' });
  }

  await markLineInviteUsed(parsed.data.token);

  const customToken = await createCustomToken(firebaseUid);
  return { status: 'activated' as const, customToken };
});
