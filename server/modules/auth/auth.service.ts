import { createError } from 'h3';
import { adminAuth } from '../../shared/firebase-admin';
import { recordLoginLog } from '../logs';
import { getPermissionsForRole, getRoleForUser } from '../roles';
import { touchUserOnLogin } from '../users';
import type { AuthUser, LoginProvider } from './auth.types';
import { Role } from '~/shared/roles';

type ProcessLoginParams = {
  idToken: string;
  provider: LoginProvider;
  ip: string;
  requestId: string;
  metadata?: Record<string, unknown>;
};

export async function processLogin(params: ProcessLoginParams): Promise<AuthUser> {
  const { idToken, provider, ip, requestId, metadata = {} } = params;

  let rawUser: Omit<AuthUser, 'username'> & { username?: string | null };
  try {
    rawUser = await verifyIdToken(idToken);
  } catch {
    await recordLoginLog({
      severity: 'WARNING',
      timestamp: new Date().toISOString(),
      requestId,
      actor: { userId: 'unknown', role: 'member' },
      metadata,
      provider,
      ip,
      result: 'failure',
    });
    throw createError({ statusCode: 401, message: 'Invalid ID token' });
  }

  if (rawUser.role !== Role.SuperAdmin) {
    const role = (await getRoleForUser(rawUser.uid)) ?? 'member';
    const permissions = await getPermissionsForRole(role);
    rawUser = { ...rawUser, role, permissions };
  }

  const firestoreUser = await touchUserOnLogin({
    uid: rawUser.uid,
    displayName: rawUser.displayName,
    phone: rawUser.phone,
  });

  if (rawUser.role !== Role.SuperAdmin) {
    await recordLoginLog({
      severity: 'INFO',
      timestamp: new Date().toISOString(),
      requestId,
      actor: { userId: rawUser.uid, role: rawUser.role },
      metadata,
      provider,
      ip,
      result: 'success',
      ...(rawUser.email ? { email: rawUser.email } : {}),
      ...(firestoreUser?.username ? { username: firestoreUser.username } : {}),
    });
  }

  return {
    uid: rawUser.uid,
    username: firestoreUser?.username ?? null,
    email: firestoreUser?.email ?? null,
    displayName: firestoreUser?.displayName ?? rawUser.displayName,
    phone: firestoreUser?.phone ?? rawUser.phone,
    providers: firestoreUser?.providers ?? [],
    role: rawUser.role,
    permissions: rawUser.permissions,
  };
}

export async function verifyIdToken(
  idToken: string,
): Promise<Omit<AuthUser, 'username'> & { username?: null }> {
  const decoded = await adminAuth().verifyIdToken(idToken);

  const role = (decoded['role'] as string | undefined) ?? 'member';
  const permissions = (decoded['permissions'] as string[] | undefined) ?? [];

  return {
    uid: decoded.uid,
    username: null,
    email: decoded.email ?? null,
    displayName: (decoded['name'] as string | undefined) ?? null,
    phone: (decoded['phone_number'] as string | undefined) ?? null,
    providers: [],
    role,
    permissions,
  };
}

export async function isSuperAdminUid(uid: string): Promise<boolean> {
  try {
    const authUser = await adminAuth().getUser(uid);
    return authUser.customClaims?.['role'] === Role.SuperAdmin;
  } catch (err) {
    if ((err as { code?: string }).code === 'auth/user-not-found') return false;
    throw err;
  }
}

export async function processPasswordLogin(params: {
  uid: string;
  username: string;
  email: string | null;
  displayName: string;
  phone: string | null;
  providers: string[];
  ip: string;
  requestId: string;
}): Promise<AuthUser> {
  const { uid, username, email, displayName, phone, providers, ip, requestId } = params;

  const isSuperAdmin = await isSuperAdminUid(uid);

  const role = isSuperAdmin ? Role.SuperAdmin : ((await getRoleForUser(uid)) ?? 'member');
  const permissions = isSuperAdmin ? [] : await getPermissionsForRole(role);

  if (!isSuperAdmin) {
    await recordLoginLog({
      severity: 'INFO',
      timestamp: new Date().toISOString(),
      requestId,
      actor: { userId: uid, role },
      metadata: {},
      provider: 'password',
      ip,
      result: 'success',
      ...(email ? { email } : {}),
      username,
    });
  }

  return { uid, username, email, displayName, phone, providers, role, permissions };
}

export async function createCustomToken(uid: string): Promise<string> {
  return adminAuth().createCustomToken(uid);
}

export async function revokeRefreshTokens(uid: string): Promise<void> {
  await adminAuth().revokeRefreshTokens(uid);
}
