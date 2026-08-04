import { GoogleLoginDto, verifyRawIdToken } from '~/modules/auth';
import { resolveUserIdByProvider } from '~/modules/identity';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = GoogleLoginDto.safeParse(body);

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request' });
  }

  const { idToken } = parsed.data;

  let identity: Awaited<ReturnType<typeof verifyRawIdToken>>;
  try {
    identity = await verifyRawIdToken(idToken);
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid ID token' });
  }

  const userId = await resolveUserIdByProvider('google', identity.firebaseUid);

  if (!userId) {
    return {
      status: 'quick-register' as const,
      googleEmail: identity.email,
      displayName: identity.displayName,
    };
  }

  return { status: 'ready' as const };
});
