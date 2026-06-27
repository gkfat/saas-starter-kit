import { revokeRefreshTokens } from '../auth';
import {
  getRolePermissions,
  getUserRole,
  getUsersByRole,
  upsertRolePermissions,
  upsertUserRole,
} from './roles.repo';
import { UserRoleSchema } from './roles.schema';

export async function getPermissionsForRole(tenantId: string, roleName: string): Promise<string[]> {
  return getRolePermissions(tenantId, roleName);
}

export async function updateRolePermissions(
  tenantId: string,
  roleName: string,
  permissions: string[],
): Promise<void> {
  await upsertRolePermissions(tenantId, roleName, permissions);

  let userIds: string[];
  try {
    userIds = await getUsersByRole(tenantId, roleName);
  } catch (err) {
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'Failed to fetch users for token revocation',
        tenantId,
        roleName,
        error: String(err),
      }),
    );
    return;
  }

  const results = await Promise.allSettled(userIds.map((uid) => revokeRefreshTokens(uid)));
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: `Failed to revoke tokens for ${failed.length}/${userIds.length} users`,
        tenantId,
        roleName,
      }),
    );
  }
}

export async function assignUserRole(
  tenantId: string,
  userId: string,
  role: string,
): Promise<void> {
  UserRoleSchema.parse({ role });
  await upsertUserRole(tenantId, userId, role);
  try {
    await revokeRefreshTokens(userId);
  } catch (err) {
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'Failed to revoke token after role assignment',
        userId,
        error: String(err),
      }),
    );
  }
}

export async function getRoleForUser(tenantId: string, userId: string): Promise<string | null> {
  return getUserRole(tenantId, userId);
}
