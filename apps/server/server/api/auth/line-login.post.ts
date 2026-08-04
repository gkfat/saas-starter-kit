import { z } from 'zod';
import { resolveLineLogin } from '~/modules/identity';

const BodySchema = z.object({
  idToken: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const parsed = BodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request' });
  }

  try {
    return await resolveLineLogin(parsed.data.idToken);
  } catch (err: unknown) {
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'LINE ID token verification failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    throw createError({ statusCode: 401, message: 'Invalid LINE ID token' });
  }
});
