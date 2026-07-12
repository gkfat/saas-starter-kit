import { z } from 'zod';
import { assignUserRole } from '~/server/modules/roles';
import { requirePermission } from '~/server/shared/rbac';
import type { AuthenticatedContext } from '~/server/shared/types/context';

const BodySchema = z.object({
  role: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  requirePermission(event, 'users:write');
  const { tenantId } = event.context as AuthenticatedContext;
  const userId = getRouterParam(event, 'id');
  if (!userId) throw createError({ statusCode: 400, message: 'Missing user id' });
  const body = BodySchema.parse(await readBody(event));
  await assignUserRole(tenantId, userId, body.role);
  return { ok: true };
});
