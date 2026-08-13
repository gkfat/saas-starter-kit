import { z } from 'zod';
import { redeemCoupon } from '~/modules/coupons';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { CouponInstanceWithState } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  code: z.string().min(1),
});

function maskCode(code: string): string {
  if (code.length <= 4) return '*'.repeat(code.length);
  return `${'*'.repeat(code.length - 4)}${code.slice(-4)}`;
}

export default defineEventHandler(async (event): Promise<CouponInstanceWithState> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Coupon]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Coupons.Redeem);

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = BodySchema.parse(await readBody(event));

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  const instance = await withAuditLog(
    {
      action: 'coupon.instance.redeem',
      actor,
      requestId,
      metadata: (result) => ({ instanceId: result.id, code: maskCode(body.code) }),
      metadataOnError: { code: maskCode(body.code) },
    },
    async () => {
      try {
        return await redeemCoupon(body, userId);
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
    },
  );

  return instance;
});
