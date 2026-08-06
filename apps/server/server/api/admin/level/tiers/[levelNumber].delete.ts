import { recordAuditLog } from '~/modules/logs';
import { deleteLevelTier } from '~/modules/level';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { OkResponse } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event): Promise<OkResponse> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Level]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.LevelTiers.Write);

  const levelNumber = Number(getRouterParam(event, 'levelNumber'));
  if (!Number.isInteger(levelNumber)) {
    throw createError({ statusCode: 400, message: 'Invalid levelNumber' });
  }

  const { userId, role, requestId } = event.context as AuthenticatedContext;

  try {
    await deleteLevelTier(levelNumber);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code?.startsWith('level-tier-')) {
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
    action: 'level.tier.delete',
    metadata: { levelNumber },
  }).catch((err) =>
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'Failed to write audit_log',
        error: String(err),
      }),
    ),
  );

  return { ok: true };
});
