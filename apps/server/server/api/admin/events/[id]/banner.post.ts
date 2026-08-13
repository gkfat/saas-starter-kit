import { uploadEventBanner } from '~/modules/events';
import { withAuditLog } from '~/modules/logs';
import { getUserById } from '~/modules/users';
import { requirePermission } from '~/shared/rbac';
import type { AuthenticatedContext } from '~/shared/types/context';
import { FeatureFlag, Permission } from '@saas-starter-kit/shared';
import type { Event } from '@saas-starter-kit/shared';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default defineEventHandler(async (event): Promise<Event> => {
  if (!useRuntimeConfig().public.featureFlags[FeatureFlag.Event]) {
    throw createError({ statusCode: 404, message: 'Feature disabled' });
  }

  requirePermission(event, Permission.Events.Write);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid id' });
  }

  const parts = await readMultipartFormData(event);
  const filePart = parts?.find((part) => part.name === 'file' && part.filename);
  if (!filePart || !filePart.filename) {
    throw createError({ statusCode: 400, message: 'Missing file' });
  }

  const filename = filePart.filename;
  const mimeType = filePart.type ?? '';
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw createError({ statusCode: 400, message: 'Unsupported file type' });
  }
  if (filePart.data.length > MAX_SIZE_BYTES) {
    throw createError({ statusCode: 400, message: 'File too large' });
  }

  const { userId, role, requestId } = event.context as AuthenticatedContext;

  const actorUser = await getUserById(userId);
  const actor = { userId, role, ...(actorUser?.username ? { username: actorUser.username } : {}) };

  const updated = await withAuditLog(
    {
      action: 'event.banner.upload',
      actor,
      requestId,
      metadata: () => ({ eventId: id, filename: filename, mimeType }),
      metadataOnError: { eventId: id, filename: filename, mimeType },
    },
    async () => {
      try {
        return await uploadEventBanner(
          id,
          { filename: filename, mimeType, size: filePart.data.length },
          filePart.data,
        );
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code === 'event-not-found') {
          throw createError({ statusCode: 404, message: (err as Error).message });
        }
        throw err;
      }
    },
  );

  return updated;
});
