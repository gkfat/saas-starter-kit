import { createError } from 'h3';
import { adminAuth } from '../../shared/firebase-admin';
import { recordLoginLog } from '../logs';
import type { AuthUser, LoginProvider } from './auth.types';

type ProcessLoginParams = {
  idToken: string;
  provider: LoginProvider;
  ip: string;
  requestId: string;
  metadata?: Record<string, unknown>;
};

export async function processLogin(params: ProcessLoginParams): Promise<AuthUser> {
  const { idToken, provider, ip, requestId, metadata = {} } = params;

  let user: AuthUser;
  try {
    user = await verifyIdToken(idToken);
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

  await recordLoginLog(user.tenantId, {
    severity: 'INFO',
    timestamp: new Date().toISOString(),
    requestId,
    actor: { userId: user.uid, tenantId: user.tenantId, role: user.role },
    metadata,
    provider,
    ip,
    result: 'success',
    email: user.email ?? undefined,
  });

  return user;
}

export async function verifyIdToken(idToken: string): Promise<AuthUser> {
  const decoded = await adminAuth().verifyIdToken(idToken);

  const role = (decoded['role'] as string | undefined) ?? 'member';
  const tenantId = (decoded['tenantId'] as string | undefined) ?? 'default';
  const permissions = (decoded['permissions'] as string[] | undefined) ?? [];

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    tenantId,
    role,
    permissions,
  };
}

export async function revokeRefreshTokens(uid: string): Promise<void> {
  await adminAuth().revokeRefreshTokens(uid);
}
