import dayjs from 'dayjs';
import { insertAuditLog, insertLoginLog, listLoginLogsSince } from './logs.repo';
import { AuditLogSchema, LoginLogSchema } from './logs.schema';
import type { AuditLog, LoginLog } from './logs.types';
import { FeatureFlag } from '@saas-starter-kit/shared';

export async function recordLoginLog(log: Omit<LoginLog, 'type'>): Promise<void> {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.LoginLog]) return;

  const validated = LoginLogSchema.parse({ ...log, type: 'login' });
  await insertLoginLog(validated);
}

export async function recordAuditLog(log: Omit<AuditLog, 'type'>): Promise<void> {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.AuditLog]) return;

  const validated = AuditLogSchema.parse({ ...log, type: 'audit' });
  await insertAuditLog(validated);
}

export async function getTodayLoginCounts(): Promise<{ success: number; failure: number }> {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.LoginLog])
    return { success: 0, failure: 0 };

  const startOfDay = dayjs().startOf('day').toISOString();
  const logs = await listLoginLogsSince(startOfDay);
  return {
    success: logs.filter((log) => log.result === 'success').length,
    failure: logs.filter((log) => log.result === 'failure').length,
  };
}
