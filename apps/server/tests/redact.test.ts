/**
 * 單元測試：redactSensitiveFields（server/shared/redact.ts）。
 * 不需啟動 server，不需 Firebase。
 */
import { describe, expect, it } from 'vitest';
import { redactSensitiveFields } from '../server/shared/redact';

describe('redactSensitiveFields', () => {
  it('遮罩頂層敏感欄位', () => {
    expect(redactSensitiveFields({ password: 'abc123', username: 'foo' })).toEqual({
      password: '[REDACTED]',
      username: 'foo',
    });
  });

  it('遮罩巢狀物件內的敏感欄位', () => {
    expect(redactSensitiveFields({ user: { idToken: 'xxx' } })).toEqual({
      user: { idToken: '[REDACTED]' },
    });
  });

  it('陣列內物件也會遞迴遮罩', () => {
    expect(redactSensitiveFields([{ token: 'xxx' }, { foo: 'bar' }])).toEqual([
      { token: '[REDACTED]' },
      { foo: 'bar' },
    ]);
  });

  it('未命中的欄位不受影響', () => {
    expect(redactSensitiveFields({ foo: 'bar', count: 1 })).toEqual({ foo: 'bar', count: 1 });
  });

  it('非物件/陣列的原始值原樣回傳', () => {
    expect(redactSensitiveFields('plain string')).toBe('plain string');
    expect(redactSensitiveFields(42)).toBe(42);
    expect(redactSensitiveFields(null)).toBe(null);
  });
});
