import { insertLoginLog } from './logs.repo';
import { LoginLogSchema } from './logs.schema';
import type { LoginLog } from './logs.types';

export async function recordLoginLog(tenantId: string, log: Omit<LoginLog, 'type'>): Promise<void> {
  const validated = LoginLogSchema.parse({ ...log, type: 'login' });
  await insertLoginLog(tenantId, validated);
}
