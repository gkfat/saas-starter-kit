import { verifyIdToken } from '../modules/auth';
import { getPermissionsForRole, getRoleForUser } from '../modules/roles';

const PUBLIC_PATHS = new Set(['/api/auth/login', '/api/auth/otp/verify']);

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
    const user = await verifyIdToken(token);
    event.context.userId = user.uid;
    event.context.tenantId = user.tenantId;
    if (user.phone) event.context.phone = user.phone;

    if (user.role === 'superadmin') {
      event.context.role = 'superadmin';
      event.context.permissions = [];
    } else {
      const role = (await getRoleForUser(user.tenantId, user.uid)) ?? 'member';
      const permissions = await getPermissionsForRole(user.tenantId, role);
      event.context.role = role;
      event.context.permissions = permissions;
    }
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' });
  }
});
