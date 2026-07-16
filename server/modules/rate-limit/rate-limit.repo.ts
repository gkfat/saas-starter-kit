import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { RateLimitPolicy, RateLimitResult } from './rate-limit.types';

type RateLimitDoc = {
  count: number;
  windowStart: number;
  lockedUntil: number | null;
};

function rateLimitRef(tenantId: string, key: string) {
  return adminDb().doc(`tenants/${tenantId}/${prefixCollection('rate_limits')}/${key}`);
}

export async function consumeRateLimit(
  tenantId: string,
  key: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const ref = rateLimitRef(tenantId, key);
  const now = Date.now();

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? (snap.data() as RateLimitDoc) : null;

    if (data?.lockedUntil && data.lockedUntil > now) {
      return { allowed: false, retryAfterSeconds: Math.ceil((data.lockedUntil - now) / 1000) };
    }

    const windowExpired =
      !data?.windowStart || now - data.windowStart >= policy.windowSeconds * 1000;
    const windowStart = windowExpired ? now : data!.windowStart;
    const count = (windowExpired ? 0 : data!.count) + 1;

    if (count > policy.maxAttempts) {
      if (policy.lockoutSeconds) {
        const lockedUntil = now + policy.lockoutSeconds * 1000;
        tx.set(ref, { count, windowStart, lockedUntil });
        return { allowed: false, retryAfterSeconds: policy.lockoutSeconds };
      }

      tx.set(ref, { count, windowStart, lockedUntil: null });
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((windowStart + policy.windowSeconds * 1000 - now) / 1000),
      };
    }

    tx.set(ref, { count, windowStart, lockedUntil: null });
    return { allowed: true };
  });
}

export async function resetRateLimit(tenantId: string, key: string): Promise<void> {
  const ref = rateLimitRef(tenantId, key);
  await ref.set({ count: 0, windowStart: Date.now(), lockedUntil: null });
}
