import { z } from 'zod';
import { hashPassword } from '~/server/shared/crypto';
import { consumeSetupToken } from '~/server/modules/password-setup';
import { setUserPassword } from '~/server/modules/users';
import { isValidPassword } from '~/shared/utils/validation';

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

  let uid: string;
  try {
    ({ uid } = await consumeSetupToken(parsed.data.token));
  } catch {
    throw createError({ statusCode: 400, message: '連結無效或已過期' });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await setUserPassword(uid, passwordHash);

  return { ok: true };
});
