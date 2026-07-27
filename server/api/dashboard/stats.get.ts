import { getDashboardStats } from '~/server/modules/dashboard';
import { requirePermission } from '~/server/shared/rbac';
import { Permission } from '~/shared/permissions';

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Members.Read);
  requirePermission(event, Permission.AdminAccounts.Read);
  requirePermission(event, Permission.LoginLogs.Read);

  return getDashboardStats();
});
