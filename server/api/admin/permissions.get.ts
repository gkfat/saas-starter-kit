import { getAllPermissions } from '~/server/modules/roles';
import type { AuthenticatedContext } from '~/server/shared/types/context';

export default defineEventHandler(async (event) => {
  const { tenantId } = event.context as AuthenticatedContext;
  return getAllPermissions(tenantId);
});
