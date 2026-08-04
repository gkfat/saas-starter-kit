import { revokeRefreshTokens } from '../../modules/auth';

export default defineEventHandler(async (event) => {
  const firebaseUid = event.context.firebaseUid;
  if (!firebaseUid) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  await revokeRefreshTokens(firebaseUid);

  return { success: true };
});
