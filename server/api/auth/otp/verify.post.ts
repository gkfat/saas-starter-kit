import { OtpVerifyDto, processLogin } from '../../../modules/auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = OtpVerifyDto.safeParse(body);

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid request body' });
  }

  const { idToken, phone } = parsed.data;
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? '';
  const requestId = event.context.requestId ?? '';

  const user = await processLogin({
    idToken,
    provider: 'phone',
    ip,
    requestId,
    metadata: { phone },
  });

  return {
    uid: user.uid,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
    permissions: user.permissions,
  };
});
