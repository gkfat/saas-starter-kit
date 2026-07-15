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
    await recordLoginLog('default', {
      severity: 'WARNING',
      timestamp: new Date().toISOString(),
      requestId,
      actor: { userId: 'unknown', tenantId: 'default', role: 'member' },
      metadata,
      provider,
      ip,
      result: 'failure',
    });
    throw createError({ statusCode: 401, message: 'Invalid ID token' });
  }

  if (rawUser.role !== Role.SuperAdmin) {
    const role = (await getRoleForUser(rawUser.tenantId, rawUser.uid)) ?? 'member';
    const permissions = await getPermissionsForRole(rawUser.tenantId, role);
    rawUser = { ...rawUser, role, permissions };
  }

  const firestoreUser = await touchUserOnLogin(rawUser.tenantId, {
    uid: rawUser.uid,
    displayName: rawUser.displayName,
    phone: rawUser.phone,
  });

  await recordLoginLog(rawUser.tenantId, {
    severity: 'INFO',
    timestamp: new Date().toISOString(),
    requestId,
    actor: { userId: rawUser.uid, tenantId: rawUser.tenantId, role: rawUser.role },
    metadata,
    provider,
    ip,
    result: 'success',
    ...(rawUser.email ? { email: rawUser.email } : {}),
    ...(firestoreUser?.username ? { username: firestoreUser.username } : {}),
  });

  return {
    uid: rawUser.uid,
    username: firestoreUser?.username ?? null,
    email: firestoreUser?.email ?? null,
    displayName: firestoreUser?.displayName ?? rawUser.displayName,
    phone: firestoreUser?.phone ?? rawUser.phone,
    providers: firestoreUser?.providers ?? [],
    tenantId: rawUser.tenantId,
    role: rawUser.role,
    permissions: rawUser.permissions,
  };
}

export async function verifyIdToken(
  idToken: string,
): Promise<Omit<AuthUser, 'username'> & { username?: null }> {
  const decoded = await adminAuth().verifyIdToken(idToken);

  const role = (decoded['role'] as string | undefined) ?? 'member';
  const tenantId = (decoded['tenantId'] as string | undefined) ?? 'default';
  const permissions = (decoded['permissions'] as string[] | undefined) ?? [];

  return {
    uid: decoded.uid,
    username: null,
    email: decoded.email ?? null,
    displayName: (decoded['name'] as string | undefined) ?? null,
    phone: (decoded['phone_number'] as string | undefined) ?? null,
    providers: [],
    tenantId,
    role,
    permissions,
  };
}

export async function processPasswordLogin(params: {
  uid: string;
  tenantId: string;
  username: string;
  email: string | null;
  displayName: string;
  phone: string | null;
  providers: string[];
  ip: string;
  requestId: string;
}): Promise<AuthUser> {
  const { uid, tenantId, username, email, displayName, phone, providers, ip, requestId } = params;

  const role = (await getRoleForUser(tenantId, uid)) ?? 'member';
  const permissions = await getPermissionsForRole(tenantId, role);

  await recordLoginLog(tenantId, {
    severity: 'INFO',
    timestamp: new Date().toISOString(),
    requestId,
    actor: { userId: uid, tenantId, role },
    metadata: {},
    provider: 'password',
    ip,
    result: 'success',
    ...(email ? { email } : {}),
    username,
  });

  return { uid, username, email, displayName, phone, providers, tenantId, role, permissions };
}

export async function createCustomToken(uid: string): Promise<string> {
  return adminAuth().createCustomToken(uid);
}

export async function revokeRefreshTokens(uid: string): Promise<void> {
  await adminAuth().revokeRefreshTokens(uid);
}
