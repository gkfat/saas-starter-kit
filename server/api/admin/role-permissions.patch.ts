import { z } from 'zod';
import { requirePermission } from '../../shared/rbac';
import { updateRolePermissions } from '../../modules/roles';

const BodySchema = z.object({
  roleName: z.string().min(1),
  permissions: z.array(z.string()),
});

export default defineEventHandler(async (event) => {
  requirePermission(event, 'admin:access');

  const body = await readBody(event);
  const { roleName, permissions } = BodySchema.parse(body);

  const tenantId = event.context.tenantId!;
  await updateRolePermissions(tenantId, roleName, permissions);

  return { ok: true };
});
