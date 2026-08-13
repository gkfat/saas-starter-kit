import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { AuditLog, LoginLog } from './logs.types';
import type { Query } from 'firebase-admin/firestore';

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

export async function listAuditLogs(range: {
  startDate?: string;
  endDate?: string;
}): Promise<AuditLog[]> {
  let query: Query = auditLogsCollection();
  if (range.startDate) query = query.where('timestamp', '>=', range.startDate);
  if (range.endDate) query = query.where('timestamp', '<=', range.endDate);

  const snapshot = await query.orderBy('timestamp', 'desc').limit(500).get();
  return snapshot.docs.map((doc) => doc.data() as AuditLog);
}
