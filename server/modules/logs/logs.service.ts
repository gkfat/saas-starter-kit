import { insertAuditLog, insertLoginLog } from './logs.repo';
import { AuditLogSchema, LoginLogSchema } from './logs.schema';
import type { AuditLog, LoginLog } from './logs.types';
import { FeatureFlag } from '~/shared/feature-flags';

export async function recordLoginLog(tenantId: string, log: Omit<LoginLog, 'type'>): Promise<void> {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.LoginLog]) return;

  const validated = LoginLogSchema.parse({ ...log, type: 'login' });
  await insertLoginLog(tenantId, validated);
}

export async function recordAuditLog(tenantId: string, log: Omit<AuditLog, 'type'>): Promise<void> {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.AuditLog]) return;

  const validated = AuditLogSchema.parse({ ...log, type: 'audit' });
  await insertAuditLog(tenantId, validated);
}
