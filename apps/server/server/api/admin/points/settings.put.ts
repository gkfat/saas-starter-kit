import { updatePointsSettings } from '~/modules/points';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { UpdatePointsSettingsRequest } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Points]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Points.Adjust);

  const { userId } = event.context as AuthenticatedContext;
  const body = await readBody<UpdatePointsSettingsRequest>(event);
  return updatePointsSettings(body, userId);
});
