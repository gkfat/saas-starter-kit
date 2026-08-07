import { getMemberCouponById } from '~/modules/coupons';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag } from '@saas-starter-kit/shared';
import type { CouponInstanceDetail } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<CouponInstanceDetail> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Coupon]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  const { userId } = event.context as AuthenticatedContext;
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  try {
    return await getMemberCouponById(id, userId);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'coupon-instance-not-found') {
      throw createError({ statusCode: 404, message: (err as Error).message });
    }
    if (code === 'coupon-instance-forbidden') {
      throw createError({ statusCode: 403, message: (err as Error).message });
    }
    throw err;
  }
});
