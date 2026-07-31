import dayjs from 'dayjs';
import { getAuthAccountStatus } from '../auth';
import { getTodayLoginCounts } from '../logs';
import { getAllUsers } from '../users';
import { getRoleForUser } from '../roles';
import type { DashboardStats } from './dashboard.types';
import { Role } from '@saas-starter-kit/shared';

export async function getDashboardStats(): Promise<DashboardStats> {
  const users = await getAllUsers();
  const details = await Promise.all(
    users.map(async (user) => ({
      user,
      status: await getAuthAccountStatus(user.uid),
      role: await getRoleForUser(user.uid),
    })),
  );
  const members = details
    .filter(({ status }) => !status.isSuperAdmin)
    .map(({ user, status, role }) => ({ ...user, disabled: status.disabled, role }));

  const total = members.length;
  const disabled = members.filter((m) => m.disabled).length;
  const pendingPassword = members.filter((m) => !m.disabled && m.passwordSetupPending).length;
  const active = total - disabled - pendingPassword;
  const byRole = {
    admin: members.filter((m) => m.role === Role.Admin).length,
    member: members.filter((m) => m.role === Role.Member).length,
  };

  const startOfDay = dayjs().startOf('day');
  const startOfWeek = dayjs().startOf('week');
  const startOfMonth = dayjs().startOf('month');
  const today = members.filter((m) => !dayjs(m.createdAt).isBefore(startOfDay)).length;
  const thisWeek = members.filter((m) => !dayjs(m.createdAt).isBefore(startOfWeek)).length;
  const thisMonth = members.filter((m) => !dayjs(m.createdAt).isBefore(startOfMonth)).length;

  const wauSince = dayjs().subtract(7, 'day');
  const mauSince = dayjs().subtract(30, 'day');
  const dau = members.filter(
    (m) => m.lastLoginAt && !dayjs(m.lastLoginAt).isBefore(startOfDay),
  ).length;
  const wau = members.filter(
    (m) => m.lastLoginAt && !dayjs(m.lastLoginAt).isBefore(wauSince),
  ).length;
  const mau = members.filter(
    (m) => m.lastLoginAt && !dayjs(m.lastLoginAt).isBefore(mauSince),
  ).length;

  const todayLogins = await getTodayLoginCounts();
  const activeRate = total === 0 ? 0 : mau / total;

  return {
    userOverview: { total, active, pendingPassword, disabled, byRole },
    userGrowth: { today, thisWeek, thisMonth },
    activeUsers: { dau, wau, mau, todayLogins, activeRate },
  };
}
