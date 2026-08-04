import { verifyAuthenticatedIdToken } from '../modules/auth';

const PUBLIC_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google-login',
  '/api/auth/google-register',
  '/api/auth/line-login',
  '/api/auth/line-register',
  '/api/auth/line-callback',
  '/api/auth/line-invite-activate',
  '/api/auth/line-bind-code-activate',
  '/api/auth/set-password',
  '/api/marketing/feature-request',
]);

export default defineEventHandler(async (event) => {
  const url = (event.node.req.url ?? '').split('?')[0];

  if (!url.startsWith('/api/')) {
    return;
  }

  if (PUBLIC_PATHS.has(url)) {
    return;
  }

  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  try {
    const identity = await verifyAuthenticatedIdToken(token);
    event.context.userId = identity.userId;
    event.context.firebaseUid = identity.firebaseUid;
    event.context.role = identity.role;
    event.context.permissions = identity.permissions;
    if (identity.phone) event.context.phone = identity.phone;
    if (identity.email) event.context.email = identity.email;
    if (identity.displayName) event.context.displayName = identity.displayName;
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' });
  }
});
