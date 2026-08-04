import { checkAndConsume, RATE_LIMIT_POLICIES } from '../modules/rate-limit';

const RATE_LIMITED_PATHS = new Set(['/api/auth/register', '/api/auth/login']);

export default defineEventHandler(async (event) => {
  const url = (event.node.req.url ?? '').split('?')[0];

  if (!RATE_LIMITED_PATHS.has(url)) {
    return;
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? '';
  const requestId = event.context.requestId ?? '';
  const context = { requestId, ip };

  if (url === '/api/auth/register') {
    const result = await checkAndConsume(
      `register:ip:${ip}`,
      RATE_LIMIT_POLICIES.register,
      context,
    );
    if (!result.allowed) {
      throw createError({ statusCode: 429, message: 'Too many registration attempts' });
    }
    return;
  }

  // /api/auth/login — IP dimension only, for every provider. Credential verification now
  // happens client-side via Firebase (signInWithEmailAndPassword / Google popup / LINE
  // Login) before this endpoint is ever called with a valid idToken, so a failed attempt
  // here no longer carries an identifier we can key an account-level lockout on. This IP
  // limit guards against generic abuse (e.g. spamming forged/garbage idTokens).
  const result = await checkAndConsume(`login:ip:${ip}`, RATE_LIMIT_POLICIES.login, context);
  if (!result.allowed) {
    throw createError({
      statusCode: 429,
      message: 'Too many login attempts, please try again later',
    });
  }
});
