import { insertAuditLog, insertLoginLog } from './logs.repo';
import { AuditLogSchema, LoginLogSchema } from './logs.schema';
import type { AuditLog, LoginLog } from './logs.types';
import { FeatureFlag } from '~/shared/feature-flags';

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
