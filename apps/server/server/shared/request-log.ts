const SENSITIVE_FIELD_KEYWORDS = ['password', 'token', 'otp'];

const MAX_BODY_LENGTH = 5000;

export function isJsonContentType(contentType?: string): boolean {
  if (!contentType) return false;
  return contentType.split(';')[0].trim().toLowerCase() === 'application/json';
}

export function maskSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskSensitiveFields(item));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, fieldValue] of Object.entries(value as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      result[key] = SENSITIVE_FIELD_KEYWORDS.some((keyword) => lowerKey.includes(keyword))
        ? '***'
        : maskSensitiveFields(fieldValue);
    }
    return result;
  }

  return value;
}

export function truncateBody(
  value: unknown,
  maxLength: number = MAX_BODY_LENGTH,
): { value: unknown; truncated: boolean } {
  const serialized = JSON.stringify(value);
  if (serialized === undefined || serialized.length <= maxLength) {
    return { value, truncated: false };
  }

  return { value: serialized.slice(0, maxLength), truncated: true };
}
