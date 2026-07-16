import { getUserByUid } from '~/server/modules/users';

export default defineEventHandler(async (event) => {
  const ctx = event.context;

  if (!ctx.userId || !ctx.role) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  const firestoreUser = await getUserByUid(ctx.userId);

  return {
    uid: ctx.userId,
    username: firestoreUser?.username ?? null,
    email: firestoreUser?.email ?? null,
    displayName: firestoreUser?.displayName ?? ctx.displayName ?? null,
    phone: firestoreUser?.phone ?? ctx.phone ?? null,
    providers: firestoreUser?.providers ?? [],
    role: ctx.role,
    permissions: ctx.permissions ?? [],
  };
});
