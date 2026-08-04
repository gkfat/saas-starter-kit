/**
 * 單元測試：add-server-request-logger 的純函式（server/shared/request-log.ts）。
 * 不需啟動 server，不需 Firebase。
 */
import { describe, expect, it } from 'vitest';
import { isJsonContentType, maskSensitiveFields, truncateBody } from '../server/shared/request-log';

describe('isJsonContentType', () => {
  it('回傳 true 當 Content-Type 為 application/json', () => {
    expect(isJsonContentType('application/json')).toBe(true);
  });

  it('回傳 true 當 Content-Type 帶 charset', () => {
    expect(isJsonContentType('application/json; charset=utf-8')).toBe(true);
  });

  it('回傳 false 當 Content-Type 非 JSON', () => {
    expect(isJsonContentType('multipart/form-data; boundary=xxx')).toBe(false);
  });

  it('回傳 false 當 Content-Type 未提供', () => {
    expect(isJsonContentType(undefined)).toBe(false);
  });
});

describe('maskSensitiveFields', () => {
  it('遮罩頂層敏感欄位', () => {
    expect(maskSensitiveFields({ password: 'abc123', username: 'foo' })).toEqual({
      password: '***',
      username: 'foo',
    });
  });

  it('遮罩巢狀物件內的敏感欄位', () => {
    expect(maskSensitiveFields({ user: { idToken: 'xxx' } })).toEqual({
      user: { idToken: '***' },
    });
  });

  it('不分大小寫比對欄位名稱', () => {
    expect(maskSensitiveFields({ Password: 'abc123' })).toEqual({ Password: '***' });
  });

  it('陣列內物件也會遞迴遮罩', () => {
    expect(maskSensitiveFields([{ token: 'xxx' }, { foo: 'bar' }])).toEqual([
      { token: '***' },
      { foo: 'bar' },
    ]);
  });

  it('未命中的欄位不受影響', () => {
    expect(maskSensitiveFields({ foo: 'bar', count: 1 })).toEqual({ foo: 'bar', count: 1 });
  });
});

describe('truncateBody', () => {
  it('未超過長度時原樣回傳，truncated 為 false', () => {
    const result = truncateBody({ foo: 'bar' }, 100);
    expect(result).toEqual({ value: { foo: 'bar' }, truncated: false });
  });

  it('超過長度時截斷並標記 truncated: true', () => {
    const longValue = { data: 'a'.repeat(100) };
    const result = truncateBody(longValue, 20);
    expect(result.truncated).toBe(true);
    expect(typeof result.value).toBe('string');
    expect((result.value as string).length).toBe(20);
  });
});
