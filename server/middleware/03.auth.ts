import { verifyIdToken } from '../modules/auth';

const PUBLIC_PATHS = new Set(['/api/auth/login', '/api/auth/otp/verify']);

export default defineEventHandler(async (event) => {
  const url = (event.node.req.url ?? '').split('?')[0];

  if (PUBLIC_PATHS.has(url)) {
    return;
  }

  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  try {
    const user = await verifyIdToken(token);
    event.context.userId = user.uid;
    event.context.tenantId = user.tenantId;
    event.context.role = user.role;
    event.context.permissions = user.permissions;
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' });
  }
});
