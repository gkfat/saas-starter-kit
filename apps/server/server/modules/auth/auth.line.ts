import { createError } from 'h3';
import { jwtVerify } from 'jose';

const LINE_ISSUER = 'https://access.line.me';

export type LineProviderConfig = {
  channelId: string;
  channelSecret: string;
};

export function getLineProviderConfig(): LineProviderConfig {
  const config = useRuntimeConfig();
  const channelId = config.lineChannelId as string | undefined;
  const channelSecret = config.lineChannelSecret as string | undefined;

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
 * LINE ID Token 依 channel 設定可能簽成 HS256（對稱、用 channel secret）或 ES256（非對稱、
 * 可用公開 JWKS 驗證）。實測本專案使用的 channel 簽出的是 HS256，因此在此以 channel secret
 * 做 HMAC 驗證；jose 的 `createRemoteJWKSet`（JWKS-only）驗不了 HS256 token。
 */
export async function verifyLineIdToken(idToken: string): Promise<LineIdentity> {
  const { channelId, channelSecret } = getLineProviderConfig();
  const secretKey = new TextEncoder().encode(channelSecret);

  const { payload } = await jwtVerify(idToken, secretKey, {
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
