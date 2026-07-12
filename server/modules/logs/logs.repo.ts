import { adminDb } from '../../shared/firebase-admin';
import type { AuditLog, LoginLog } from './logs.types';

export async function insertLoginLog(tenantId: string, log: LoginLog): Promise<void> {
  await adminDb().collection(`tenants/${tenantId}/login_logs`).add(log);
}

export async function listLoginLogs(tenantId: string): Promise<LoginLog[]> {
  const snapshot = await adminDb()
    .collection(`tenants/${tenantId}/login_logs`)
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();
  return snapshot.docs.map((doc) => doc.data() as LoginLog);
}

export async function listAuditLogs(tenantId: string): Promise<AuditLog[]> {
  const snapshot = await adminDb()
    .collection(`tenants/${tenantId}/audit_logs`)
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();
  return snapshot.docs.map((doc) => doc.data() as AuditLog);
}
