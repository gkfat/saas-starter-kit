import { adminAuth } from '~/shared/firebase-admin';
import { hashPassword } from '~/shared/crypto';
import { RegisterDto } from '~/modules/auth';
import { registerUser } from '~/modules/users';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = RegisterDto.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid request',
    });
  }

  const { username, password, email, phone } = parsed.data;

  let uid: string;
  try {
    const created = await adminAuth().createUser({ displayName: username });
    uid = created.uid;
  } catch {
    throw createError({ statusCode: 500, message: '建立帳號失敗' });
  }

  const passwordHash = await hashPassword(password);

  try {
    await registerUser({
      uid,
      username,
      displayName: username,
      email: email ?? null,
      phone: phone ?? null,
      providers: ['password'],
      passwordHash,
    });
  } catch (err: unknown) {
    await adminAuth()
      .deleteUser(uid)
      .catch(() => {});
    const code = (err as { code?: string }).code;
    if (code === 'username-taken') {
      throw createError({ statusCode: 409, message: '此帳號名稱已被使用' });
    }
    throw createError({ statusCode: 500, message: '建立帳號失敗' });
  }

  return { uid };
});
