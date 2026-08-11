import { getVisibleEventById } from '~/modules/events';
import { FeatureFlag } from '@saas-starter-kit/shared';
import type { Event } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<Event> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Event]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  try {
    return await getVisibleEventById(id);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'event-not-found' || code === 'event-not-visible') {
      throw createError({ statusCode: 404, message: (err as Error).message });
    }
    throw err;
  }
});
