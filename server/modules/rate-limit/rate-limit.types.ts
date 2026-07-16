export type RateLimitPolicy = {
  windowSeconds: number;
  maxAttempts: number;
  lockoutSeconds?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};
