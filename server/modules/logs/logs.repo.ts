import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { AuditLog, LoginLog } from './logs.types';

function loginLogsCollection() {
  return adminDb().collection(prefixCollection('login_logs'));
}

function auditLogsCollection() {
  return adminDb().collection(prefixCollection('audit_logs'));
}

export async function insertLoginLog(log: LoginLog): Promise<void> {
  await loginLogsCollection().add(log);
}

export async function insertAuditLog(log: AuditLog): Promise<void> {
  await auditLogsCollection().add(log);
}

export async function listLoginLogs(): Promise<LoginLog[]> {
  const snapshot = await loginLogsCollection().orderBy('timestamp', 'desc').limit(100).get();
  return snapshot.docs.map((doc) => doc.data() as LoginLog);
}

export async function listLoginLogsSince(since: string): Promise<LoginLog[]> {
  const snapshot = await loginLogsCollection().where('timestamp', '>=', since).get();
  return snapshot.docs.map((doc) => doc.data() as LoginLog);
}

export async function listAuditLogs(): Promise<AuditLog[]> {
  const snapshot = await auditLogsCollection().orderBy('timestamp', 'desc').limit(100).get();
  return snapshot.docs.map((doc) => doc.data() as AuditLog);
}
