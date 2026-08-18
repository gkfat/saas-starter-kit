import { z } from 'zod';
import { syncUserEmail } from '~/modules/users';
import type { AuthenticatedContext } from '~/shared/types/context';
import type { OkResponse } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  email: z.string().trim().email(),
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

  try {
    await syncUserEmail(ctx.userId, parsed.data.email);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'contact-taken') {
      throw createError({
        statusCode: 409,
        message: '更新失敗，請確認輸入資料後再試',
        data: { code: 'contact-taken' },
      });
    }
    throw err;
  }

  return { ok: true };
});
