import { z } from 'zod';
import { issueCoupons } from '~/modules/coupons';
import { withAuditLog } from '~/modules/logs';
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

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  const instances = await withAuditLog(
    {
      action: 'coupon.instance.issue',
      actor,
      requestId,
      metadata: (result) => ({
        templateId: id,
        memberIds: body.memberIds,
        count: result.length,
      }),
      metadataOnError: { templateId: id, memberIds: body.memberIds },
    },
    async () => {
      try {
        return await issueCoupons(id, body, userId);
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
    },
  );

  return instances;
});
