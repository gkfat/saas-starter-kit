import { z } from 'zod';
import { getLineProviderConfig } from '~/modules/auth';
import { resolveLineLogin } from '~/modules/identity';

const BodySchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().min(1),
});

const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';

export default defineEventHandler(async (event) => {
  const parsed = BodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request' });
  }

  const { channelId, channelSecret } = getLineProviderConfig();

  const tokenRes = await fetch(LINE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: parsed.data.code,
      redirect_uri: parsed.data.redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!tokenRes.ok) {
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'LINE authorization code exchange failed',
        status: tokenRes.status,
      }),
    );
    throw createError({ statusCode: 401, message: 'LINE 授權失敗，請重新登入' });
  }

  const tokenData = (await tokenRes.json()) as { id_token?: string };
  if (!tokenData.id_token) {
    throw createError({ statusCode: 401, message: 'LINE 授權失敗，請重新登入' });
  }

  try {
    const result = await resolveLineLogin(tokenData.id_token);
    if (result.status === 'quick-register') {
      // quick-register 需要把換好的 idToken 帶回前端，供選定 username 後呼叫既有
      // /api/auth/line-register 完成註冊；換出來的 raw idToken 本身不是密鑰，回傳給前端
      // 與 LIFF 端直接持有 idToken 的情況一致。
      return { ...result, idToken: tokenData.id_token };
    }
    return result;
  } catch (err: unknown) {
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        message: 'LINE ID token verification failed',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    throw createError({ statusCode: 401, message: 'Invalid LINE ID token' });
  }
});
