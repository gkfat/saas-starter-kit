import { checkAndConsume, RATE_LIMIT_POLICIES } from '../modules/rate-limit';

const RATE_LIMITED_PATHS = new Set(['/api/auth/register', '/api/auth/login']);

export default defineEventHandler(async (event) => {
  const url = (event.node.req.url ?? '').split('?')[0];

  if (!RATE_LIMITED_PATHS.has(url)) {
    return;
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? '';
  const requestId = event.context.requestId ?? '';
  const tenantId = 'default';
  const context = { requestId, ip };

  if (url === '/api/auth/register') {
    const result = await checkAndConsume(
      tenantId,
      `register:ip:${ip}`,
      RATE_LIMIT_POLICIES.register,
      context,
    );
    if (!result.allowed) {
      throw createError({ statusCode: 429, message: 'Too many registration attempts' });
    }
    return;
  }

  // /api/auth/login — only password flow is rate-limited (google/phone bypass)
  const body = await readBody<{ provider?: string; identifier?: string }>(event);
  if (body?.provider !== 'password') {
    return;
  }

  const identifier = body.identifier ?? '';
  const loginContext = { ...context, username: identifier };

  const ipResult = await checkAndConsume(
    tenantId,
    `login:ip:${ip}`,
    RATE_LIMIT_POLICIES.login,
    loginContext,
  );
  if (!ipResult.allowed) {
    throw createError({
      statusCode: 429,
      message: 'Too many login attempts, please try again later',
    });
  }

  const accountResult = await checkAndConsume(
    tenantId,
    `login:account:${identifier}`,
    RATE_LIMIT_POLICIES.login,
    loginContext,
  );
  if (!accountResult.allowed) {
    throw createError({
      statusCode: 429,
      message: 'Too many login attempts, please try again later',
    });
  }
});
