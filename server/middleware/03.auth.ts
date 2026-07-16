import { Role } from '~/shared/roles';
import { verifyIdToken } from '../modules/auth';
import { getPermissionsForRole, getRoleForUser } from '../modules/roles';

const PUBLIC_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google-login',
  '/api/auth/google-register',
  '/api/auth/otp/verify',
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
    const user = await verifyIdToken(token);
    event.context.userId = user.uid;
    if (user.phone) event.context.phone = user.phone;
    if (user.email) event.context.email = user.email;
    if (user.displayName) event.context.displayName = user.displayName;

    if (user.role === Role.SuperAdmin) {
      event.context.role = Role.SuperAdmin;
      event.context.permissions = [];
    } else {
      const role = (await getRoleForUser(user.uid)) ?? 'member';
      const permissions = await getPermissionsForRole(role);
      event.context.role = role;
      event.context.permissions = permissions;
    }
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' });
  }
});
