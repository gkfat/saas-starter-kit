import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import { PermissionSchema, RolePermissionSchema, RoleSchema, UserRoleSchema } from './roles.schema';
import type { Permission, Role } from './roles.types';

function rolesCollection() {
  return adminDb().collection(prefixCollection('roles'));
}

function permissionsCollection() {
  return adminDb().collection(prefixCollection('permissions'));
}

function rolePermissionsRef(roleName: string) {
  return adminDb().doc(`${prefixCollection('role_permissions')}/${roleName}`);
}

function rolePermissionsCollection() {
  return adminDb().collection(prefixCollection('role_permissions'));
}

function userRolesRef(userId: string) {
  return adminDb().doc(`${prefixCollection('user_roles')}/${userId}`);
}

function userRolesCollection() {
  return adminDb().collection(prefixCollection('user_roles'));
}

export async function getRolePermissions(roleName: string): Promise<string[]> {
  const doc = await rolePermissionsRef(roleName).get();
  if (!doc.exists) {
    console.warn(
      JSON.stringify({
        severity: 'WARNING',
        message: 'role_permissions doc not found',
        roleName,
      }),
    );
    return [];
  }
  return RolePermissionSchema.parse(doc.data()).permissions;
}

export async function upsertRolePermissions(
  roleName: string,
  permissions: string[],
): Promise<void> {
  await rolePermissionsRef(roleName).set({ permissions });
}

export async function getUsersByRole(roleName: string): Promise<string[]> {
  const snapshot = await userRolesCollection().where('role', '==', roleName).get();
  return snapshot.docs.map((doc) => doc.id);
}

export async function getUserRole(userId: string): Promise<string | null> {
  const doc = await userRolesRef(userId).get();
  if (!doc.exists) return null;
  return UserRoleSchema.parse(doc.data()).role;
}

export async function upsertUserRole(userId: string, role: string): Promise<void> {
  await userRolesRef(userId).set({ role });
}

export async function removeUserRole(userId: string): Promise<void> {
  await userRolesRef(userId).delete();
}

export async function listRoles(): Promise<Role[]> {
  const snapshot = await rolesCollection().get();
  return snapshot.docs.map((doc) => RoleSchema.parse(doc.data()));
}

export async function listPermissions(): Promise<Permission[]> {
  const snapshot = await permissionsCollection().get();
  return snapshot.docs.map((doc) => PermissionSchema.parse(doc.data()));
}

export async function listAllRolePermissions(): Promise<Record<string, string[]>> {
  const snapshot = await rolePermissionsCollection().get();
  const result: Record<string, string[]> = {};
  for (const doc of snapshot.docs) {
    const parsed = RolePermissionSchema.parse(doc.data());
    result[doc.id] = parsed.permissions;
  }
  return result;
}
