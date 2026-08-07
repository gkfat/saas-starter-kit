import { z } from 'zod';
import { issueCoupons } from '~/modules/coupons';
import { recordAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { CouponInstance } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1),
});

export default defineEventHandler(async (event): Promise<CouponInstance[]> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Coupon]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Coupons.Issue);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = BodySchema.parse(await readBody(event));

  let instances: CouponInstance[];
  try {
    instances = await issueCoupons(id, body, userId);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'coupon-template-not-found') {
      throw createError({ statusCode: 404, message: (err as Error).message });
    }
    if (code === 'coupon-template-not-publishable') {
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
    action: 'coupon.instance.issue',
    metadata: { templateId: id, memberIds: body.memberIds, count: instances.length },
  }).catch((err) =>
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'Failed to write audit_log',
        error: String(err),
      }),
    ),
  );

  return instances;
});
