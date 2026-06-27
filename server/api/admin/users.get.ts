import { getAllUsers } from '~/server/modules/users';
import type { AuthenticatedContext } from '~/server/shared/types/context';

export default defineEventHandler(async (event) => {
  const { tenantId } = event.context as AuthenticatedContext;
  return getAllUsers(tenantId);
});
