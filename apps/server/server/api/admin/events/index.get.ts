import { listEvents } from '~/modules/events';
import { requirePermission } from '~/shared/rbac';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Event]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Events.Read);
  return listEvents();
});
