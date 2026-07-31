import { GoogleRegisterDto, verifyIdToken } from '~/modules/auth';
import { registerUser } from '~/modules/users';

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

  let googleUser: Awaited<ReturnType<typeof verifyIdToken>>;
  try {
    googleUser = await verifyIdToken(idToken);
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid ID token' });
  }

  try {
    await registerUser({
      uid: googleUser.uid,
      username,
      displayName: googleUser.displayName ?? username,
      email: googleUser.email,
      phone: null,
      providers: ['google'],
    });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'username-taken') {
      throw createError({ statusCode: 409, message: '此帳號名稱已被使用' });
    }
    throw createError({ statusCode: 500, message: '建立帳號失敗' });
  }

  return { uid: googleUser.uid };
});
