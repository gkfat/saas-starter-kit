import { Role, isSyntheticEmail } from '@saas-starter-kit/shared';
import { getUserById } from '~/modules/users';
import { listProvidersForUser } from '~/modules/identity';

export default defineEventHandler(async (event) => {
  const ctx = event.context;

  if (!ctx.userId || !ctx.role) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const isSuperAdmin = ctx.role === Role.SuperAdmin;

  const [firestoreUser, providers] = await Promise.all([
    isSuperAdmin ? Promise.resolve(null) : getUserById(ctx.userId),
    isSuperAdmin ? Promise.resolve(['password'] as const) : listProvidersForUser(ctx.userId),
  ]);

  const fallbackEmail = ctx.email && !isSyntheticEmail(ctx.email) ? ctx.email : null;

  return {
    userId: ctx.userId,
    username: firestoreUser?.username ?? ctx.displayName ?? null,
    email: firestoreUser?.email ?? fallbackEmail,
    displayName: firestoreUser?.displayName ?? ctx.displayName ?? null,
    phone: firestoreUser?.phone ?? ctx.phone ?? null,
    memberNo: firestoreUser?.memberNo ?? null,
    providers,
    role: ctx.role,
    permissions: ctx.permissions ?? [],
  };
});
