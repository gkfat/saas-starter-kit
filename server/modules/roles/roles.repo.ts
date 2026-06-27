import { adminDb } from '../../shared/firebase-admin';
import { PermissionSchema, RolePermissionSchema, RoleSchema, UserRoleSchema } from './roles.schema';
import type { Permission, Role } from './roles.types';

function rolesCollection(tenantId: string) {
  return adminDb().collection(`tenants/${tenantId}/roles`);
}

function permissionsCollection(tenantId: string) {
  return adminDb().collection(`tenants/${tenantId}/permissions`);
}

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

export async function listRoles(tenantId: string): Promise<Role[]> {
  const snapshot = await rolesCollection(tenantId).get();
  return snapshot.docs.map((doc) => RoleSchema.parse(doc.data()));
}

export async function listPermissions(tenantId: string): Promise<Permission[]> {
  const snapshot = await permissionsCollection(tenantId).get();
  return snapshot.docs.map((doc) => PermissionSchema.parse(doc.data()));
}

export async function listAllRolePermissions(tenantId: string): Promise<Record<string, string[]>> {
  const snapshot = await adminDb().collection(`tenants/${tenantId}/role_permissions`).get();
  const result: Record<string, string[]> = {};
  for (const doc of snapshot.docs) {
    const parsed = RolePermissionSchema.parse(doc.data());
    result[doc.id] = parsed.permissions;
  }
  return result;
}
