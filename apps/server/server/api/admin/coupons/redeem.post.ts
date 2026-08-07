import { z } from 'zod';
import { redeemCoupon } from '~/modules/coupons';
import { recordAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { CouponInstanceWithState } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  code: z.string().min(1),
});

export default defineEventHandler(async (event): Promise<CouponInstanceWithState> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Coupon]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Coupons.Redeem);

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = BodySchema.parse(await readBody(event));

  let instance: CouponInstanceWithState;
  try {
    instance = await redeemCoupon(body, userId);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'coupon-not-found') {
      throw createError({ statusCode: 404, message: (err as Error).message });
    }
    if (code === 'coupon-already-redeemed' || code === 'coupon-expired') {
      throw createError({ statusCode: 409, message: (err as Error).message });
    }
    throw err;
  }

  const actorUser = await getUserById(userId);
  recordAuditLog({
    severity: 'INFO',
    timestamp: new Date().toISOString(),
    requestId,
    actor: { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) },
    action: 'coupon.instance.redeem',
    metadata: { instanceId: instance.id, code: body.code },
  }).catch((err) =>
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'Failed to write audit_log',
        error: String(err),
      }),
    ),
  );

  return instance;
});
