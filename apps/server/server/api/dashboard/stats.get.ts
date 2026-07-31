import { getDashboardStats } from '~/modules/dashboard';
import { requirePermission } from '~/shared/rbac';
import { Permission } from '@saas-starter-kit/shared';

export default defineEventHandler(async (event) => {
  requirePermission(event, Permission.Members.Read);
  requirePermission(event, Permission.AdminAccounts.Read);
  requirePermission(event, Permission.LoginLogs.Read);

  return getDashboardStats();
});
