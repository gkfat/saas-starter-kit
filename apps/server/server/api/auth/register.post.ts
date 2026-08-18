import { adminAuth } from '~/shared/firebase-admin';
import { RegisterDto, verifyRawIdToken } from '~/modules/auth';
import { registerUserWithProvider } from '~/modules/users';
import type { OkResponse } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<OkResponse> => {
  const body = await readBody(event);
  const parsed = RegisterDto.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid request',
    });
  }

  const { idToken, username, email, phone } = parsed.data;

  let identity: Awaited<ReturnType<typeof verifyRawIdToken>>;
  try {
    identity = await verifyRawIdToken(idToken);
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid ID token' });
  }

  try {
    await registerUserWithProvider({
      username,
      displayName: username,
      email: email ?? null,
      phone: phone ?? null,
      providerType: 'password',
      providerUserId: username,
      firebaseUid: identity.firebaseUid,
    });
  } catch (err: unknown) {
    await adminAuth()
      .deleteUser(identity.firebaseUid)
      .catch(() => {});
    const code = (err as { code?: string }).code;
    if (code === 'username-taken') {
      throw createError({
        statusCode: 409,
        message: '此帳號名稱已被使用',
        data: { code: 'username-taken' },
      });
    }
    if (code === 'contact-taken') {
      throw createError({
        statusCode: 409,
        message: '註冊失敗，請確認輸入資料後再試',
        data: { code: 'contact-taken' },
      });
    }
    throw createError({ statusCode: 500, message: '建立帳號失敗' });
  }

  return { ok: true };
});
