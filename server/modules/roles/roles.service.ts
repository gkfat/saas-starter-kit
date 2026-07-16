import { revokeRefreshTokens } from '../auth';
import {
  getRolePermissions,
  getUserRole,
  getUsersByRole,
  listAllRolePermissions,
  listPermissions,
  listRoles,
  upsertRolePermissions,
  upsertUserRole,
} from './roles.repo';
import type { Permission, Role } from './roles.types';
import { UserRoleSchema } from './roles.schema';

export async function getPermissionsForRole(roleName: string): Promise<string[]> {
  return getRolePermissions(roleName);
}

export async function updateRolePermissions(
  roleName: string,
  permissions: string[],
): Promise<void> {
  await upsertRolePermissions(roleName, permissions);

  let userIds: string[];
  try {
    userIds = await getUsersByRole(roleName);
  } catch (err) {
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'Failed to fetch users for token revocation',
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
        roleName,
      }),
    );
  }
}

export async function assignUserRole(userId: string, role: string): Promise<void> {
  UserRoleSchema.parse({ role });
  await upsertUserRole(userId, role);
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

export async function getRoleForUser(userId: string): Promise<string | null> {
  return getUserRole(userId);
}

export async function getAllRoles(): Promise<Role[]> {
  return listRoles();
}

export async function getAllPermissions(): Promise<Permission[]> {
  return listPermissions();
}

export async function getAllRolePermissions(): Promise<Record<string, string[]>> {
  return listAllRolePermissions();
}
