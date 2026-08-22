import { createError } from 'h3';
import type { ZodSchema } from 'zod';

/**
 * `Schema.parse()` throws a raw `ZodError`, which h3 doesn't recognize as a client error —
 * left uncaught it surfaces as a 500. Use this wherever a route needs to map validation
 * failures to 400, matching the pattern already used in profile/auth routes (see
 * `api/profile/display-name.patch.ts`).
 */
export function parseOrBadRequest<T>(schema: ZodSchema<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid request',
    });
  }
  return parsed.data;
}
