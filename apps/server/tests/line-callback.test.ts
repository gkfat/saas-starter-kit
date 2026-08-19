/**
 * 整合測試：add-line-liff-identity 新增的 admin LINE Login Web OAuth 端點
 * （`POST /api/auth/line-callback`）。需先啟動 dev server（pnpm dev），預設打
 * http://localhost:3000，可用 TEST_BASE_URL 環境變數覆寫；需要 `.env` 設定
 * `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET`。
 *
 * 未涵蓋：真實 LINE Login OAuth 端到端流程（需要真實使用者在 LINE 完成授權才能取得
 * 有效的 authorization code，CI/本機測試環境無法取得）。以下測試改以「無效的
 * authorization code」驗證 code exchange 失敗時的行為，以及缺少必要欄位時的驗證邏輯。
 */
import { describe, expect, it } from 'vitest';
import '../../../scripts/load-root-env';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

describe('POST /api/auth/line-callback', () => {
  it('缺少 code → 400', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/line-callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirectUri: 'http://localhost:3005/auth/line-callback' }),
    });
    expect(res.status).toBe(400);
  });

  it('缺少 redirectUri → 400', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/line-callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'some-code' }),
    });
    expect(res.status).toBe(400);
  });

  it('無效的 authorization code → code exchange 失敗，回傳 401', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/line-callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'not-a-real-authorization-code',
        redirectUri: 'http://localhost:3005/auth/line-callback',
      }),
    });
    expect(res.status).toBe(401);
  });
});
