export default defineEventHandler((event) => {
  const ctx = event.context;

  if (!ctx.userId || !ctx.tenantId || !ctx.role) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  return {
    uid: ctx.userId,
    email: ctx.email ?? null,
    displayName: ctx.displayName ?? null,
    phone: ctx.phone ?? null,
    tenantId: ctx.tenantId,
    role: ctx.role,
    permissions: ctx.permissions ?? [],
  };
});
