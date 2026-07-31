import { z } from 'zod';
import { syncUserDisplayName } from '~/modules/users';
import type { AuthenticatedContext } from '~/shared/types/context';
import type { OkResponse } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  displayName: z.string().trim().min(1).max(20),
});

export default defineEventHandler(async (event): Promise<OkResponse> => {
  const ctx = event.context as AuthenticatedContext;
  const parsed = BodySchema.safeParse(await readBody(event));

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid request',
    });
  }

  await syncUserDisplayName(ctx.userId, parsed.data.displayName);

  return { ok: true };
});
