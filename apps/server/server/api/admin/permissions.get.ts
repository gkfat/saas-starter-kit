import { getAllPermissions } from '~/modules/roles';
import { requirePermission } from '~/shared/rbac';
import { Permission } from '@saas-starter-kit/shared';

export default defineEventHandler((event) => {
  requirePermission(event, Permission.Permissions.Read);
  return getAllPermissions();
});
