import { getUserById } from '~/modules/users';
import { listProvidersForUser } from '~/modules/identity';

export default defineEventHandler(async (event) => {
  const ctx = event.context;

  if (!ctx.userId || !ctx.role) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const [firestoreUser, providers] = await Promise.all([
    getUserById(ctx.userId),
    listProvidersForUser(ctx.userId),
  ]);

  return {
    userId: ctx.userId,
    username: firestoreUser?.username ?? ctx.displayName ?? null,
    email: firestoreUser?.email ?? ctx.email ?? null,
    displayName: firestoreUser?.displayName ?? ctx.displayName ?? null,
    phone: firestoreUser?.phone ?? ctx.phone ?? null,
    providers,
    role: ctx.role,
    permissions: ctx.permissions ?? [],
  };
});
