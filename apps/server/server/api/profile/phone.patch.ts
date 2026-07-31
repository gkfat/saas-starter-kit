import { syncUserPhone } from '~/modules/users';
import type { AuthenticatedContext } from '~/shared/types/context';

export default defineEventHandler(async (event) => {
  const ctx = event.context as AuthenticatedContext;

  if (!ctx.phone) {
    throw createError({ statusCode: 400, message: 'No phone number found in token' });
  }

  await syncUserPhone(ctx.userId, ctx.phone);

  return { ok: true };
});
