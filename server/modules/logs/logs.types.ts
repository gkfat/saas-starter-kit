import type { LoginProvider } from '../auth';

export type LogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export type BaseLog = {
  type: 'audit' | 'login' | 'api';
  severity: LogSeverity;
  timestamp: string;
  requestId: string;
  actor: {
    userId: string;
    tenantId: string;
    role: string;
  };
  metadata: Record<string, unknown>;
};

export type LoginLog = BaseLog & {
  type: 'login';
  provider: LoginProvider;
  ip: string;
  result: 'success' | 'failure';
  email?: string;
};
