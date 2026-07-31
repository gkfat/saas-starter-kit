import { recordLoginLog } from '../logs';
import { consumeRateLimit, resetRateLimit } from './rate-limit.repo';
import type { RateLimitPolicy, RateLimitResult } from './rate-limit.types';

type CheckAndConsumeContext = {
  requestId: string;
  ip: string;
  username?: string;
};

export async function checkAndConsume(
  key: string,
  policy: RateLimitPolicy,
  context: CheckAndConsumeContext,
): Promise<RateLimitResult> {
  const result = await consumeRateLimit(key, policy);

  if (!result.allowed) {
    await recordLoginLog({
      severity: 'WARNING',
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      actor: { userId: 'unknown', role: 'member' },
      metadata: { reason: 'rate_limited', key, retryAfterSeconds: result.retryAfterSeconds },
      provider: 'password',
      ip: context.ip,
      result: 'failure',
      ...(context.username ? { username: context.username } : {}),
    });
  }

  return result;
}

export async function resetOnSuccess(key: string): Promise<void> {
  await resetRateLimit(key);
}
