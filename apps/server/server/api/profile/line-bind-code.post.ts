import { generateLineBindCode } from '~/modules/identity';
import type { AuthenticatedContext } from '~/shared/types/context';

export default defineEventHandler(async (event) => {
  const ctx = event.context as AuthenticatedContext;

  const code = await generateLineBindCode(ctx.userId);

  const config = useRuntimeConfig();
  const liffUrl = config.liffId
    ? `https://liff.line.me/${config.liffId}/auth/bind?code=${code}`
    : null;

  return { code, expiresInSeconds: 5 * 60, liffUrl };
});
