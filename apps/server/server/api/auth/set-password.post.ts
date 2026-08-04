import { z } from 'zod';
import { adminAuth } from '~/shared/firebase-admin';
import { consumeSetupToken } from '~/modules/password-setup';
import { completePasswordSetup, getUserById } from '~/modules/users';
import { isValidPassword, toSyntheticEmail } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  token: z.string().min(1),
  password: z.string().refine(isValidPassword, '密碼須為 6–8 碼英數字'),
});

export default defineEventHandler(async (event) => {
  const parsed = BodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid request',
    });
  }

  let userId: string;
  let firebaseUid: string;
  try {
    ({ userId, firebaseUid } = await consumeSetupToken(parsed.data.token));
  } catch {
    throw createError({ statusCode: 400, message: '連結無效或已過期' });
  }

  const user = await getUserById(userId);
  if (!user) {
    throw createError({ statusCode: 400, message: '連結無效或已過期' });
  }

  await adminAuth().updateUser(firebaseUid, {
    email: toSyntheticEmail(user.username),
    emailVerified: true,
    password: parsed.data.password,
  });
  await completePasswordSetup(userId);

  return { ok: true };
});
