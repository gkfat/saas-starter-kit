import { z } from 'zod';
import { withAuditLog } from '~/modules/logs';
import { createLevelTier } from '~/modules/level';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { OkResponse } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  levelNumber: z.number().int().positive(),
  name: z.string().min(1),
  metricThreshold: z.number().nonnegative(),
});

export default defineEventHandler(async (event): Promise<OkResponse> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Level]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.LevelTiers.Write);

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = BodySchema.parse(await readBody(event));

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  await withAuditLog(
    {
      action: 'level.tier.create',
      actor,
      requestId,
      metadata: () => body,
      metadataOnError: body,
    },
    async () => {
      try {
        await createLevelTier(body);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code?.startsWith('level-tier-')) {
          throw createError({ statusCode: 409, message: (err as Error).message });
        }
        throw err;
      }
    },
  );

  return { ok: true };
});
