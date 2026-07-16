import { GoogleLoginDto, verifyIdToken } from '~/server/modules/auth';
import { getUserByUid } from '~/server/modules/users';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = GoogleLoginDto.safeParse(body);

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request' });
  }

  const { idToken } = parsed.data;

  let googleUser: Awaited<ReturnType<typeof verifyIdToken>>;
  try {
    googleUser = await verifyIdToken(idToken);
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid ID token' });
  }

  const firestoreUser = await getUserByUid(googleUser.uid);

  if (!firestoreUser || !firestoreUser.providers.includes('google')) {
    return {
      status: 'quick-register' as const,
      googleEmail: googleUser.email,
      displayName: googleUser.displayName,
    };
  }

  return { status: 'ready' as const };
});
