import { z } from 'zod';
import { recordAuditLog } from '../../modules/logs';
import { updateRolePermissions } from '../../modules/roles';
import { requirePermission } from '../../shared/rbac';
import type { AuthenticatedContext } from '../../shared/types/context';
import { getUserByUid } from '~/server/modules/users';
import { Permission } from '~/shared/permissions';
import { Role } from '~/shared/roles';

const BodySchema = z.object({
  roleName: z.string().min(1),
  permissions: z.array(z.string()),
});

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Roles.Write);

  const { tenantId, userId, role, requestId } = event.context as AuthenticatedContext;
  const body = await readBody(event);
  const { roleName, permissions } = BodySchema.parse(body);

  await updateRolePermissions(tenantId, roleName, permissions);

  if (role !== Role.SuperAdmin) {
    const actorUser = await getUserByUid(tenantId, userId);

    recordAuditLog(tenantId, {
      severity: 'INFO',
      timestamp: new Date().toISOString(),
      requestId,
      actor: {
        userId,
        tenantId,
        role: role ?? 'unknown',
        ...(actorUser?.username ? { username: actorUser.username } : {}),
      },
      action: 'role.permissions.update',
      metadata: { roleName, permissions },
    }).catch((err) =>
      console.error(
        JSON.stringify({
          severity: 'ERROR',
          message: 'Failed to write audit_log',
          error: String(err),
        }),
      ),
    );
  }

  return { ok: true };
});
