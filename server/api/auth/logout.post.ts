import { revokeRefreshTokens } from '../../modules/auth';

export default defineEventHandler(async (event) => {
  const userId = event.context.userId;
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }

  await revokeRefreshTokens(userId);

  return { success: true };
});
