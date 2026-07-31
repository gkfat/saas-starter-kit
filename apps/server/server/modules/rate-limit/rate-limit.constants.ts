import type { RateLimitPolicy } from './rate-limit.types';

export const RATE_LIMIT_POLICIES = {
  register: { windowSeconds: 3600, maxAttempts: 10 },
  login: { windowSeconds: 900, maxAttempts: 5, lockoutSeconds: 900 },
} as const satisfies Record<string, RateLimitPolicy>;
