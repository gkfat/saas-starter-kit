import dayjs from 'dayjs';
import {
  insertAuditLog,
  insertLoginLog,
  listAuditLogs as listAuditLogsFromRepo,
  listLoginLogs as listLoginLogsFromRepo,
  listLoginLogsSince,
} from './logs.repo';
import { AuditLogSchema, LoginLogSchema } from './logs.schema';
import type { AuditLog, LoginLog } from './logs.types';
import { FeatureFlag } from '@saas-starter-kit/shared';
import { redactSensitiveFields } from '../../shared/redact';

export async function recordLoginLog(log: Omit<LoginLog, 'type'>): Promise<void> {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.LoginLog]) return;

  const validated = LoginLogSchema.parse({ ...log, type: 'login' });
  await insertLoginLog(validated);
}

export async function recordAuditLog(log: Omit<AuditLog, 'type'>): Promise<void> {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.AuditLog]) return;

  const validated = AuditLogSchema.parse({
    ...log,
    type: 'audit',
    metadata: redactSensitiveFields(log.metadata) as Record<string, unknown>,
  });
  await insertAuditLog(validated);
}

export type WithAuditLogParams<T> = {
  action: string;
  actor: AuditLog['actor'];
  requestId: string;
  metadata?: (result: T) => Record<string, unknown>;
  metadataOnError?: Record<string, unknown>;
};

/**
 * Wraps a business-significant operation so it is audited whether it succeeds or fails.
 * The original error is rethrown untouched so callers can still map it to an HTTP response.
 */
export async function withAuditLog<T>(
  params: WithAuditLogParams<T>,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const result = await fn();
    recordAuditLog({
      severity: 'INFO',
      timestamp: new Date().toISOString(),
      requestId: params.requestId,
      actor: params.actor,
      action: params.action,
      result: 'success',
      metadata: params.metadata ? params.metadata(result) : {},
    }).catch((err) => console.error('Failed to record audit log', err));
    return result;
  } catch (err) {
    recordAuditLog({
      severity: 'WARNING',
      timestamp: new Date().toISOString(),
      requestId: params.requestId,
      actor: params.actor,
      action: params.action,
      result: 'failure',
      metadata: {
        ...(params.metadataOnError ?? {}),
        error: err instanceof Error ? err.message : String(err),
      },
    }).catch((e) => console.error('Failed to record audit log', e));
    throw err;
  }
}

export async function listLoginLogs(): Promise<LoginLog[]> {
  return listLoginLogsFromRepo();
}

export type ListAuditLogsQuery = {
  startDate?: string;
  endDate?: string;
  actor?: string;
  action?: string;
};

export async function listAuditLogs(query: ListAuditLogsQuery = {}): Promise<AuditLog[]> {
  const logs = await listAuditLogsFromRepo({
    startDate: query.startDate ? dayjs(query.startDate).toISOString() : undefined,
    endDate: query.endDate ? dayjs(query.endDate).toISOString() : undefined,
  });

  const actorKeyword = query.actor?.trim().toLowerCase();
  const action = query.action?.trim();

  return logs.filter((log) => {
    if (actorKeyword) {
      const matchesActor =
        log.actor.username?.toLowerCase().includes(actorKeyword) ||
        log.actor.userId.toLowerCase().includes(actorKeyword);
      if (!matchesActor) return false;
    }
    if (action && log.action !== action) return false;
    return true;
  });
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
