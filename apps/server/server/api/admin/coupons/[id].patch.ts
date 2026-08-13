import { z } from 'zod';
import { updateCouponTemplate } from '~/modules/coupons';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { CouponTemplate } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  discountType: z.enum(['fixed', 'percentage', 'item']).optional(),
  discountValue: z.number().positive().optional(),
  validDays: z.number().int().positive().optional(),
  status: z.enum(['draft', 'published', 'disabled']).optional(),
});

export default defineEventHandler(async (event): Promise<CouponTemplate> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Coupon]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Coupons.Write);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = BodySchema.parse(await readBody(event));

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  const template = await withAuditLog(
    {
      action: 'coupon.template.update',
      actor,
      requestId,
      metadata: () => ({ templateId: id, ...body }),
      metadataOnError: { templateId: id, ...body },
    },
    async () => {
      try {
        return await updateCouponTemplate(id, body);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === 'coupon-template-not-found') {
          throw createError({ statusCode: 404, message: (err as Error).message });
        }
        throw err;
      }
    },
  );

  return template;
});
