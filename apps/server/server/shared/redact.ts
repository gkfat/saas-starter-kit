const SENSITIVE_KEYS = new Set([
  'password',
  'newPassword',
  'oldPassword',
  'currentPassword',
  'token',
  'idToken',
  'accessToken',
  'refreshToken',
  'setupToken',
  'inviteToken',
  'secret',
  'authorization',
]);

const REDACTED = '[REDACTED]';

export function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveFields);

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) => [
        key,
        SENSITIVE_KEYS.has(key) ? REDACTED : redactSensitiveFields(v),
      ]),
    );
  }

  return value;
}
