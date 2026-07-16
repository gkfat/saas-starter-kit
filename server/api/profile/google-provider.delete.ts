import { unbindGoogleProvider } from '~/server/modules/users';
import type { AuthenticatedContext } from '~/server/shared/types/context';

export default defineEventHandler(async (event) => {
  const ctx = event.context as AuthenticatedContext;

  try {
    await unbindGoogleProvider(ctx.userId);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'last-provider') {
      throw createError({ statusCode: 409, message: 'Cannot remove the only login method' });
    }
    throw err;
  }

  return { ok: true };
});
