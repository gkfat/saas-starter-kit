import { createError, getRequestHeader } from 'h3';
import type { H3Event } from 'h3';

const LEVEL_BATCH_SECRET_HEADER = 'x-level-batch-secret';

export function requireLevelBatchSecret(event: H3Event): void {
  const expected = useRuntimeConfig().levelBatchSecret;
  const provided = getRequestHeader(event, LEVEL_BATCH_SECRET_HEADER);

  if (!expected || !provided || provided !== expected) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }
}
