import { bindGoogleProvider } from '~/modules/users';
import type { AuthenticatedContext } from '~/shared/types/context';

export default defineEventHandler(async (event) => {
  const ctx = event.context as AuthenticatedContext;

  await bindGoogleProvider(ctx.userId);

  return { ok: true };
});
