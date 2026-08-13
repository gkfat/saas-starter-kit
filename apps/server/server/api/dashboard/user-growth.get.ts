import { z } from 'zod';
import { getUserGrowthSeries } from '~/modules/dashboard';
import { requirePermission } from '~/shared/rbac';
import { Permission } from '@saas-starter-kit/shared';

const QuerySchema = z.object({
  range: z.enum(['all', 'today', 'yesterday', 'week', 'month', 'halfYear', 'year']).default('week'),
});

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Members.Read);
  const { range } = QuerySchema.parse(getQuery(event));
  return getUserGrowthSeries(range);
});
