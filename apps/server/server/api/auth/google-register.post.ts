import { GoogleRegisterDto, verifyRawIdToken } from '~/modules/auth';
import { registerUserWithProvider } from '~/modules/users';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = GoogleRegisterDto.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid request',
    });
  }

  const { username, idToken } = parsed.data;

  let identity: Awaited<ReturnType<typeof verifyRawIdToken>>;
  try {
    identity = await verifyRawIdToken(idToken);
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid ID token' });
  }

  try {
    await registerUserWithProvider({
      username,
      displayName: identity.displayName ?? username,
      email: identity.email,
      phone: null,
      providerType: 'google',
      providerUserId: identity.firebaseUid,
      firebaseUid: identity.firebaseUid,
    });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'username-taken') {
      throw createError({ statusCode: 409, message: '此帳號名稱已被使用' });
    }
    throw createError({ statusCode: 500, message: '建立帳號失敗' });
  }

  return { ok: true };
});
