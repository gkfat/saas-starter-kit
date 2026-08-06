import { LoginDto, verifyAuthenticatedIdToken } from '../../modules/auth';
import { touchUserOnLogin } from '../../modules/users';
import { listProvidersForUser } from '../../modules/identity';
import { recordLoginLog } from '../../modules/logs';
import { resetOnSuccess } from '../../modules/rate-limit';
import type { LoginProvider } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = LoginDto.safeParse(body);

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request body' });
  }

  const { idToken, provider } = parsed.data;
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? '';
  const requestId = event.context.requestId ?? '';

  let identity: Awaited<ReturnType<typeof verifyAuthenticatedIdToken>>;
  try {
    identity = await verifyAuthenticatedIdToken(idToken);
  } catch {
    await recordLoginLog({
      severity: 'WARNING',
      timestamp: new Date().toISOString(),
      requestId,
      actor: { userId: 'unknown', role: 'member' },
      metadata: {},
      provider: provider as LoginProvider,
      ip,
      result: 'failure',
    });
    throw createError({ statusCode: 401, message: 'Invalid ID token' });
  }

  const firestoreUser = identity.isSuperAdmin
    ? null
    : await touchUserOnLogin({
        userId: identity.userId,
        displayName: identity.displayName,
        phone: identity.phone,
      });

  await resetOnSuccess(`login:ip:${ip}`);

  const providers = identity.isSuperAdmin ? [] : await listProvidersForUser(identity.userId);

  if (!identity.isSuperAdmin) {
    await recordLoginLog({
      severity: 'INFO',
      timestamp: new Date().toISOString(),
      requestId,
      actor: { userId: identity.userId, role: identity.role },
      metadata: {},
      provider: provider as LoginProvider,
      ip,
      result: 'success',
      ...(identity.email ? { email: identity.email } : {}),
      ...(firestoreUser?.username ? { username: firestoreUser.username } : {}),
    });
  }

  return {
    userId: identity.userId,
    username: firestoreUser?.username ?? identity.displayName,
    email: firestoreUser?.email ?? identity.email,
    displayName: firestoreUser?.displayName ?? identity.displayName,
    phone: firestoreUser?.phone ?? identity.phone,
    memberNo: firestoreUser?.memberNo ?? null,
    providers,
    role: identity.role,
    permissions: identity.permissions,
  };
});
