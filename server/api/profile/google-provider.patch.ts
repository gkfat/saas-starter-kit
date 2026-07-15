import { bindGoogleProvider } from '~/server/modules/users';
import type { AuthenticatedContext } from '~/server/shared/types/context';

export default defineEventHandler(async (event) => {
  const ctx = event.context as AuthenticatedContext;

  await bindGoogleProvider(ctx.tenantId, ctx.userId);

  return { ok: true };
});
