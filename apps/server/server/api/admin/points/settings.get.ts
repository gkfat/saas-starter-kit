import { getSettings } from '~/modules/points';
import { requirePermission } from '~/shared/rbac';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Points]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Points.Read);
  return getSettings();
});
