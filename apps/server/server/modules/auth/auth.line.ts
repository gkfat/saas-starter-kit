import { createError } from 'h3';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';

const LINE_ISSUER = 'https://access.line.me';
const LINE_JWKS_URL = 'https://api.line.me/oauth2/v2.1/certs';
const lineJwks = createRemoteJWKSet(new URL(LINE_JWKS_URL));

export type LineProviderConfig = {
  channelId: string;
  channelSecret: string;
};

export function getLineProviderConfig(): LineProviderConfig {
  const config = useRuntimeConfig();
  // Nitro's runtime-config env override (utils.env.mjs `getEnv`) runs every value through
  // `destr()` regardless of the declared default's type, so a purely numeric
  // NITRO_LINE_CHANNEL_ID (LINE channel IDs are numeric) arrives here as a JS number, not a
  // string — which then breaks jose's `audience` option (expects string | string[]).
  const channelId = config.lineChannelId ? String(config.lineChannelId) : '';
  const channelSecret = config.lineChannelSecret ? String(config.lineChannelSecret) : '';

  if (!channelId) {
    throw new Error('Missing LINE_CHANNEL_ID env var');
  }
  if (!channelSecret) {
    throw new Error('Missing LINE_CHANNEL_SECRET env var');
  }

  return { channelId, channelSecret };
}

export type LineIdentity = {
  lineUserId: string;
  displayName: string | null;
  email: string | null;
};

/**
 * LINE ID Token 依 channel 的「Assertion Signing Algorithm」設定，可能簽成 HS256（對稱、用
 * channel secret 做 HMAC 驗證）或 ES256（非對稱、需用 LINE 公開 JWKS 驗證）——這是 channel
 * 層級的設定，同一個 repo 對接不同 channel 時可能拿到不同演算法的 token，不能寫死其中一種。
 * 因此先解出（不驗證）JWT header 的 `alg`，再依演算法選擇對應的驗證金鑰來源。
 */
export async function verifyLineIdToken(idToken: string): Promise<LineIdentity> {
  const { channelId, channelSecret } = getLineProviderConfig();
  const { alg } = decodeProtectedHeader(idToken);

  const { payload } =
    alg === 'HS256'
      ? await jwtVerify(idToken, new TextEncoder().encode(channelSecret), {
          issuer: LINE_ISSUER,
          audience: channelId,
        })
      : await jwtVerify(idToken, lineJwks, {
          issuer: LINE_ISSUER,
          audience: channelId,
        });

  if (typeof payload.sub !== 'string') {
    throw createError({ statusCode: 401, message: 'Invalid LINE ID token' });
  }

  return {
    lineUserId: payload.sub,
    displayName: (payload['name'] as string | undefined) ?? null,
    email: (payload['email'] as string | undefined) ?? null,
  };
}
