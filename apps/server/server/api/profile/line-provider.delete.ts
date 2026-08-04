import { unbindProvider, revokeSessionsForUser } from '~/modules/identity';
import type { AuthenticatedContext } from '~/shared/types/context';

export default defineEventHandler(async (event) => {
  const ctx = event.context as AuthenticatedContext;

  try {
    await unbindProvider(ctx.userId, 'line');
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'last-provider') {
      throw createError({ statusCode: 409, message: 'Cannot remove the only login method' });
    }
    throw err;
  }

  await revokeSessionsForUser(ctx.userId);

  return { ok: true };
});
