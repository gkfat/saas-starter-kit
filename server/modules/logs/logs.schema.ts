import { z } from 'zod';

export const BaseLogSchema = z.object({
  type: z.enum(['audit', 'login', 'api']),
  severity: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR']),
  timestamp: z.string(),
  requestId: z.string(),
  actor: z.object({
    userId: z.string(),
    tenantId: z.string(),
    role: z.string(),
  }),
  metadata: z.record(z.unknown()),
});

export const LoginLogSchema = BaseLogSchema.extend({
  type: z.literal('login'),
  provider: z.enum(['email', 'google', 'phone']),
  ip: z.string(),
  result: z.enum(['success', 'failure']),
  email: z.string().optional(),
});
