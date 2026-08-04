import { z } from 'zod';

export const BaseLogSchema = z.object({
  type: z.enum(['audit', 'login', 'api']),
  severity: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR']),
  timestamp: z.string(),
  requestId: z.string(),
  actor: z.object({
    userId: z.string(),
    role: z.string(),
    username: z.string().optional(),
  }),
  metadata: z.record(z.unknown()),
});

export const LoginLogSchema = BaseLogSchema.extend({
  type: z.literal('login'),
  provider: z.enum(['password', 'google', 'phone', 'line']),
  ip: z.string(),
  result: z.enum(['success', 'failure']),
  email: z.string().optional(),
  username: z.string().optional(),
});

export const AuditLogSchema = BaseLogSchema.extend({
  type: z.literal('audit'),
  action: z.string(),
  resourceId: z.string().optional(),
  diff: z.record(z.object({ before: z.unknown(), after: z.unknown() })).optional(),
});
