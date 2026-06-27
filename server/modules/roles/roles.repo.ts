import { adminDb } from '../../shared/firebase-admin';
import { RolePermissionSchema, UserRoleSchema } from './roles.schema';

function rolePermissionsRef(tenantId: string, roleName: string) {
  return adminDb().doc(`tenants/${tenantId}/role_permissions/${roleName}`);
}

function userRolesRef(tenantId: string, userId: string) {
  return adminDb().doc(`tenants/${tenantId}/user_roles/${userId}`);
}

function userRolesCollection(tenantId: string) {
  return adminDb().collection(`tenants/${tenantId}/user_roles`);
}

export async function getRolePermissions(tenantId: string, roleName: string): Promise<string[]> {
  const doc = await rolePermissionsRef(tenantId, roleName).get();
  if (!doc.exists) {
    console.warn(
      JSON.stringify({
        severity: 'WARNING',
        message: 'role_permissions doc not found',
        tenantId,
        roleName,
      }),
    );
    return [];
  }
  return RolePermissionSchema.parse(doc.data()).permissions;
}

export async function upsertRolePermissions(
  tenantId: string,
  roleName: string,
  permissions: string[],
): Promise<void> {
  await rolePermissionsRef(tenantId, roleName).set({ permissions });
}

export async function getUsersByRole(tenantId: string, roleName: string): Promise<string[]> {
  const snapshot = await userRolesCollection(tenantId).where('role', '==', roleName).get();
  return snapshot.docs.map((doc) => doc.id);
}

export async function getUserRole(tenantId: string, userId: string): Promise<string | null> {
  const doc = await userRolesRef(tenantId, userId).get();
  if (!doc.exists) return null;
  return UserRoleSchema.parse(doc.data()).role;
}

export async function upsertUserRole(
  tenantId: string,
  userId: string,
  role: string,
): Promise<void> {
  await userRolesRef(tenantId, userId).set({ role });
}
