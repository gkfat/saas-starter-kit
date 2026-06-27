import { adminDb } from '../../shared/firebase-admin';
import type { LoginLog } from './logs.types';

export async function insertLoginLog(tenantId: string, log: LoginLog): Promise<void> {
  await adminDb().collection(`tenants/${tenantId}/login_logs`).add(log);
}
