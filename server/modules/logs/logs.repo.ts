import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { AuditLog, LoginLog } from './logs.types';

function loginLogsCollection(tenantId: string) {
  return adminDb().collection(`tenants/${tenantId}/${prefixCollection('login_logs')}`);
}

function auditLogsCollection(tenantId: string) {
  return adminDb().collection(`tenants/${tenantId}/${prefixCollection('audit_logs')}`);
}

export async function insertLoginLog(tenantId: string, log: LoginLog): Promise<void> {
  await loginLogsCollection(tenantId).add(log);
}

export async function insertAuditLog(tenantId: string, log: AuditLog): Promise<void> {
  await auditLogsCollection(tenantId).add(log);
}

export async function listLoginLogs(tenantId: string): Promise<LoginLog[]> {
  const snapshot = await loginLogsCollection(tenantId)
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();
  return snapshot.docs.map((doc) => doc.data() as LoginLog);
}

export async function listAuditLogs(tenantId: string): Promise<AuditLog[]> {
  const snapshot = await auditLogsCollection(tenantId)
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();
  return snapshot.docs.map((doc) => doc.data() as AuditLog);
}
