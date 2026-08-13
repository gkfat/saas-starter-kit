import { z } from 'zod';
import { withAuditLog } from '../../modules/logs';
import { updateRolePermissions } from '../../modules/roles';
import { requirePermission } from '../../shared/rbac';
import type { AuthenticatedContext } from '../../shared/types/context';
import { getUserById } from '~/modules/users';
import { Permission } from '@saas-starter-kit/shared';
import type { OkResponse } from '@saas-starter-kit/shared';

const BodySchema = z.object({
  roleName: z.string().min(1),
  permissions: z.array(z.string()),
});

export default defineEventHandler(async (event): Promise<OkResponse> => {
  requirePermission(event, Permission.Roles.Write);

  const { userId, role, requestId } = event.context as AuthenticatedContext;
  const body = await readBody(event);
  const { roleName, permissions } = BodySchema.parse(body);

  const actorUser = await getUserById(userId);
  const actor = {
    userId,
    role: role ?? 'unknown',
    ...(actorUser?.username ? { username: actorUser.username } : {}),
  };

  await withAuditLog(
    {
      action: 'role.permissions.update',
      actor,
      requestId,
      metadata: () => ({ roleName, permissions }),
      metadataOnError: { roleName, permissions },
    },
    () => updateRolePermissions(roleName, permissions),
  );

  return { ok: true };
});
