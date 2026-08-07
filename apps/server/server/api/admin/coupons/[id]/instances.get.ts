import { listCouponInstancesByTemplate } from '~/modules/coupons';
import { requirePermission } from '~/shared/rbac';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Coupon]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Coupons.Read);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  return listCouponInstancesByTemplate(id);
});
