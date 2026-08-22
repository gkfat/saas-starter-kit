import { listMemberBookings } from '~/modules/booking';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Booking]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  const { userId } = event.context as AuthenticatedContext;
  return listMemberBookings(userId);
});
