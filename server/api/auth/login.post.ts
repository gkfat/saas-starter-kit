import {
  LoginDto,
  processLogin,
  processPasswordLogin,
  createCustomToken,
} from '../../modules/auth';
import { getUserWithHashByIdentifier } from '../../modules/users';
import { verifyPassword } from '../../shared/crypto';
import { resetOnSuccess } from '../../modules/rate-limit';
import { recordLoginLog } from '../../modules/logs';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = LoginDto.safeParse(body);

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request body' });
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? '';
  const requestId = event.context.requestId ?? '';

  if (parsed.data.provider === 'password') {
    const { identifier, password } = parsed.data;

    const firestoreUser = await getUserWithHashByIdentifier(identifier);

    const valid =
      firestoreUser?.passwordHash != null &&
      (await verifyPassword(firestoreUser.passwordHash, password));

    if (!valid) {
      await recordLoginLog({
        severity: 'WARNING',
        timestamp: new Date().toISOString(),
        requestId,
        actor: { userId: 'unknown', role: 'member' },
        metadata: {},
        provider: 'password',
        ip,
        result: 'failure',
        username: identifier,
      });
      throw createError({ statusCode: 401, message: '帳號或密碼錯誤' });
    }

    await resetOnSuccess(`login:account:${identifier}`);

    const [user, customToken] = await Promise.all([
      processPasswordLogin({
        uid: firestoreUser!.uid,
        username: firestoreUser!.username,
        email: firestoreUser!.email,
        displayName: firestoreUser!.displayName,
        phone: firestoreUser!.phone,
        providers: firestoreUser!.providers,
        ip,
        requestId,
      }),
      createCustomToken(firestoreUser!.uid),
    ]);

    return {
      uid: user.uid,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      providers: user.providers,
      role: user.role,
      permissions: user.permissions,
      customToken,
    };
  }

  // OAuth flow (google / phone)
  const { idToken, provider } = parsed.data;
  const user = await processLogin({ idToken, provider, ip, requestId });

  return {
    uid: user.uid,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    phone: user.phone,
    providers: user.providers,
    role: user.role,
    permissions: user.permissions,
  };
});
