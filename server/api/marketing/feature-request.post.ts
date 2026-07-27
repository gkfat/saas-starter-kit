import { FeatureRequestDto, submitFeatureRequest } from '~/server/modules/marketing';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = FeatureRequestDto.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid request',
    });
  }

  submitFeatureRequest(parsed.data, event.context.requestId ?? '');

  return { success: true };
});
