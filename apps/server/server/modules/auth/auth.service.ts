import { createError } from 'h3';
import { Role } from '@saas-starter-kit/shared';
import { adminAuth } from '../../shared/firebase-admin';
import { getPermissionsForRole, getRoleForUser } from '../roles';

export type RawIdentity = {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  phone: string | null;
};

export type VerifiedIdentity = RawIdentity & {
  userId: string;
  isSuperAdmin: boolean;
  role: string;
  permissions: string[];
};

export async function verifyRawIdToken(idToken: string): Promise<RawIdentity> {
  const decoded = await adminAuth().verifyIdToken(idToken);
  return {
    firebaseUid: decoded.uid,
    email: decoded.email ?? null,
    displayName: (decoded['name'] as string | undefined) ?? null,
    phone: (decoded['phone_number'] as string | undefined) ?? null,
  };
}

export async function verifyAuthenticatedIdToken(idToken: string): Promise<VerifiedIdentity> {
  const decoded = await adminAuth().verifyIdToken(idToken);
  const isSuperAdmin = decoded['role'] === Role.SuperAdmin;
  const claimedUserId = (decoded['userId'] as string | undefined) ?? null;

  if (!isSuperAdmin && !claimedUserId) {
    throw createError({ statusCode: 401, message: 'Missing identity mapping' });
  }

  const userId = isSuperAdmin ? decoded.uid : claimedUserId!;
  const role = isSuperAdmin ? Role.SuperAdmin : ((await getRoleForUser(userId)) ?? 'member');
  const permissions = isSuperAdmin ? [] : await getPermissionsForRole(role);

  return {
    firebaseUid: decoded.uid,
    userId,
    isSuperAdmin,
    email: decoded.email ?? null,
    displayName: (decoded['name'] as string | undefined) ?? null,
    phone: (decoded['phone_number'] as string | undefined) ?? null,
    role,
    permissions,
  };
}

export async function createCustomToken(firebaseUid: string): Promise<string> {
  return adminAuth().createCustomToken(firebaseUid);
}

export async function revokeRefreshTokens(firebaseUid: string): Promise<void> {
  await adminAuth().revokeRefreshTokens(firebaseUid);
}
