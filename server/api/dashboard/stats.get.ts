import { getDashboardStats } from '~/server/modules/dashboard';
import { requirePermission } from '~/server/shared/rbac';
import { Permission } from '~/shared/permissions';

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Users.Read);
  requirePermission(event, Permission.LoginLogs.Read);

  return getDashboardStats();
});
